-- Daha önce gönderilmiş, gizlenmemiş ilanları bir defa 30 günlük yayına al.
-- Taslaklar, düzeltme istenenler, geçmiş ilanlar ve mevcut yayınlar değişmez.
DECLARE @now datetime2 = SYSUTCDATETIME();
UPDATE l
SET Status = 4, Active = 1, PublishedAt = @now,
    ExpiresAt = DATEADD(day, 30, @now),
    ReviewedBy = NULL, ReviewedAt = NULL, ReviewNote = NULL
FROM dbo.Listings l
WHERE l.Status IN (1, 3) AND l.Hidden = 0 AND l.IsDeleted = 0
    AND LEN(LTRIM(RTRIM(l.Baslik))) BETWEEN 5 AND 150
    AND LEN(LTRIM(RTRIM(l.MeyveTuru))) BETWEEN 1 AND 100
    AND LEN(LTRIM(RTRIM(l.Il))) BETWEEN 1 AND 100
    AND LEN(LTRIM(RTRIM(l.Ilce))) BETWEEN 1 AND 100
    AND LEN(l.Telefon) BETWEEN 10 AND 25
    AND l.Telefon NOT LIKE '%[^+0-9 ()-]%'
    AND l.MiktarKg BETWEEN 0.01 AND 100000000
    AND l.KilogramFiyati BETWEEN 0.01 AND 1000000
    AND (SELECT COUNT(*) FROM dbo.ListingPhotos p WHERE p.ListingId = l.Id) BETWEEN 1 AND 10;
