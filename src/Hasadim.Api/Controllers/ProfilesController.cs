using Hasadim.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Hasadim.Api.Controllers;
[ApiController,Route("api/profiles")]
public class ProfilesController(ProfileService service,IWebHostEnvironment env):ControllerBase
{
 [Authorize,HttpGet("me")]public async Task<IActionResult> Mine(CancellationToken ct)=>Ok(await service.Mine(ct));
 [Authorize,HttpPut("me")]public async Task<IActionResult> Update(ProfileRequest r,CancellationToken ct){await service.Update(r,ct);return Ok(await service.Mine(ct));}
 [HttpGet("{id:guid}")]public async Task<IActionResult> Public(Guid id,CancellationToken ct)=>Ok(await service.Public(id,ct));
 string Folder=>Path.Combine(env.ContentRootPath,"App_Data","profiles");
 void Remove(string? name){if(name is null||Path.GetFileName(name)!=name)return;try{System.IO.File.Delete(Path.Combine(Folder,name));}catch(IOException){}}
 [Authorize,HttpPost("me/photo"),RequestSizeLimit(4000000)]
 public async Task<IActionResult> Upload(IFormFile file,CancellationToken ct)
 {
  if(file.Length<12||file.Length>3000000)return BadRequest(new{mesaj="Fotoğraf en fazla 3 MB olmalıdır."});
  await using var input=file.OpenReadStream();var head=new byte[12];await input.ReadExactlyAsync(head,ct);string? ext=null;
  if(head[0]==255&&head[1]==216&&head[2]==255)ext=".jpg";
  if(head.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}))ext=".png";
  if(System.Text.Encoding.ASCII.GetString(head,0,4)=="RIFF"&&System.Text.Encoding.ASCII.GetString(head,8,4)=="WEBP")ext=".webp";
  if(ext is null)return BadRequest(new{mesaj="JPG, PNG veya WebP seçin."});
  Directory.CreateDirectory(Folder);var name=Guid.NewGuid().ToString("N")+ext;var path=Path.Combine(Folder,name);
  await using(var output=System.IO.File.Create(path)){await output.WriteAsync(head,ct);await input.CopyToAsync(output,ct);}
  string? previous;try{previous=await service.SetPhoto(name,ct);}catch{System.IO.File.Delete(path);throw;}Remove(previous);return Ok(await service.Mine(ct));
 }
 [Authorize,HttpDelete("me/photo")]public async Task<IActionResult> DeletePhoto(CancellationToken ct){Remove(await service.SetPhoto(null,ct));return Ok(await service.Mine(ct));}
 [HttpGet("{id:guid}/photo")]
 public async Task<IActionResult> Photo(Guid id,CancellationToken ct){var name=await service.PhotoFile(id,ct);if(name is null||Path.GetFileName(name)!=name)return NotFound();var path=Path.Combine(Folder,name);if(!System.IO.File.Exists(path))return NotFound();return PhysicalFile(path,Path.GetExtension(name) switch{".jpg"=>"image/jpeg",".png"=>"image/png",_=>"image/webp"});}
}
