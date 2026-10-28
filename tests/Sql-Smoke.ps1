param([string]$BaseUrl = "https://localhost:7106")
$ErrorActionPreference = "Stop"
function Check($Condition, $Name) { if (-not $Condition) { throw "FAIL: $Name" }; Write-Host "PASS: $Name" -ForegroundColor Green }
function Call($Session, $Method, $Path, $Body = $null, $Token = $null) {
    $p = @{ Uri="$BaseUrl$Path"; Method=$Method; WebSession=$Session; UseBasicParsing=$true }
    if ($Token) { $p.Headers=@{ 'X-CSRF-TOKEN'=$Token } }
    if ($null -ne $Body) { $p.ContentType='application/json; charset=utf-8'; $p.Body=[Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 8)) }
    Invoke-RestMethod @p
}
function CreateListing($Session,$Listing,$Token) {
 $boundary=[Guid]::NewGuid().ToString('N')
 $json=$Listing | ConvertTo-Json -Compress
 $head=[Text.Encoding]::UTF8.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"listing`"`r`n`r`n$json`r`n--$boundary`r`nContent-Disposition: form-data; name=`"files`"; filename=`"test.png`"`r`nContent-Type: image/png`r`n`r`n")
 $image=[Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1xkAAAAASUVORK5CYII=')
 $tail=[Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
 Invoke-RestMethod -Uri "$BaseUrl/api/meyve-ilanlari/with-photos" -Method POST -WebSession $Session -Headers @{'X-CSRF-TOKEN'=$Token} -ContentType "multipart/form-data; boundary=$boundary" -Body ([byte[]]($head+$image+$tail))
}
function Token($Session) { (Call $Session 'GET' '/api/csrf').token }
function Expect($Expected, [scriptblock]$Action) {
    try { & $Action | Out-Null; throw "Expected HTTP $Expected" }
    catch { if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq $Expected) { Write-Host "PASS: HTTP $Expected" -ForegroundColor Green } else { throw } }
}
$a=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$b=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$guest=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$stamp=[Guid]::NewGuid().ToString('N')
$password="TestPass123-$stamp"
foreach ($x in @(@{Session=$a;Email="seller-$stamp@example.test"},@{Session=$b;Email="buyer-$stamp@example.test"})) {
 $t=Token $x.Session
 $registered=Call $x.Session 'POST' '/api/account/register' @{displayName='Local Test';email=$x.Email;password=$password} $t
 if ($registered.requiresConfirmation) { throw 'Use a local Development database with confirmation disabled.' }
 Call $x.Session 'POST' '/api/account/login' @{email=$x.Email;password=$password} $t | Out-Null
}
$ta=Token $a; $tb=Token $b; $ua=Call $a 'GET' '/api/account/me'
$ids=New-Object System.Collections.Generic.List[string]
$listing=@{baslik="Test fruit $stamp";meyveTuru='Elma';cesit='Test';miktarKg=500;kilogramFiyati=25;il='Antalya';ilce='Korkuteli';telefon='05000000000';aciklama='Local test';active=$true}
try {
 Expect 400 {Call $a 'POST' '/api/meyve-ilanlari' $listing $ta}
 $one=CreateListing $a $listing $ta; $ids.Add($one.id)
 $two=CreateListing $a $listing $ta; $ids.Add($two.id)
 Check ([Guid]::Parse($one.id) -ne [Guid]::Empty) 'GUID identity'
 Check ($one.id -ne $two.id) 'Same user can create two separate listings'
 $mine=Call $a 'GET' '/api/meyve-ilanlari?mine=true'
 Check ($mine.total -eq 2) 'Both listings persisted for one owner'
 $detail=Call $a 'GET' "/api/meyve-ilanlari/$($one.id)"
 $edit=$listing.Clone();$edit.version=$detail.version
 Expect 403 {Call $b 'PUT' "/api/meyve-ilanlari/$($one.id)" $edit $tb}
 Expect 403 {Call $b 'DELETE' "/api/meyve-ilanlari/$($one.id)" $null $tb}
 Check ($detail.status -eq 4) 'New listing is automatically published'
 Check ($detail.active) 'Published listing is active'
 Expect 409 {Call $a 'PUT' "/api/meyve-ilanlari/$($one.id)" $edit $ta}
 Expect 400 {Call $a 'POST' '/api/meyve-ilanlari' $listing}
 Check (([datetime]$detail.expiresAt - [datetime]$detail.publishedAt).TotalDays -eq 30) 'Publication lasts 30 days'
 $public=Call $guest 'GET' "/api/meyve-ilanlari/$($one.id)"
 Check ($public.status -eq 4 -and $null -eq $public.telefon) 'Published listing visible with guest phone privacy'
 Call $b 'POST' "/api/meyve-ilanlari/$($one.id)/favorite" $null $tb | Out-Null
 Call $b 'POST' '/api/messages' @{listingId=$one.id;recipientId=$ua.id;body='Test message'} $tb | Out-Null
 Expect 403 {Call $b 'GET' '/api/admin/listings/pending'}
 Expect 401 {Call $guest 'GET' '/api/messages'}
 Expect 403 {Call $b 'GET' '/api/admin/reports'}
 Write-Host 'All SQL-backed automatic-publication smoke tests passed.' -ForegroundColor Green
} finally {
 foreach($id in $ids) {try {Call $a 'DELETE' "/api/meyve-ilanlari/$id" $null $ta | Out-Null} catch {Write-Warning "Could not archive test listing $id"}}
}
