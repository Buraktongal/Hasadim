using Hasadim.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Hasadim.Api.Controllers;
[ApiController,Route("api/profiles")]
public class ProfilesController(ProfileService service,IWebHostEnvironment env,IConfiguration config):ControllerBase
{
 [Authorize,HttpGet("me")]public async Task<IActionResult> Mine(CancellationToken ct)=>Ok(await service.Mine(ct));
 [Authorize,HttpPut("me")]public async Task<IActionResult> Update(ProfileRequest r,CancellationToken ct){await service.Update(r,ct);return Ok(await service.Mine(ct));}
 [HttpGet("search")]public async Task<IActionResult> Search([FromQuery]string? q,CancellationToken ct)=>Ok(await service.Search(q,ct));
 [HttpGet("{id:guid}")]public async Task<IActionResult> Public(Guid id,CancellationToken ct)=>Ok(await service.Public(id,ct));
 string Folder=>Hasadim.Api.Hosting.StoragePaths.Folder(config,env,"profiles");
 void Remove(string? name){if(name is null||Path.GetFileName(name)!=name)return;try{System.IO.File.Delete(Path.Combine(Folder,name));}catch(IOException){}}
 // Fotoğraf dosyası yalnızca imzasına (JPG/PNG/WebP) bakılarak kabul edilir; dosya adı sunucuda üretilir.
 async Task<(string? name,IActionResult? error)> Save(IFormFile file,int max,CancellationToken ct)
 {
  if(file.Length<12||file.Length>max)return(null,BadRequest(new{mesaj=$"Fotoğraf en fazla {max/1000000} MB olmalıdır."}));
  await using var input=file.OpenReadStream();var head=new byte[12];await input.ReadExactlyAsync(head,ct);string? ext=null;
  if(head[0]==255&&head[1]==216&&head[2]==255)ext=".jpg";
  if(head.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10}))ext=".png";
  if(System.Text.Encoding.ASCII.GetString(head,0,4)=="RIFF"&&System.Text.Encoding.ASCII.GetString(head,8,4)=="WEBP")ext=".webp";
  if(ext is null)return(null,BadRequest(new{mesaj="JPG, PNG veya WebP seçin."}));
  Directory.CreateDirectory(Folder);var name=Guid.NewGuid().ToString("N")+ext;var path=Path.Combine(Folder,name);
  await using(var output=System.IO.File.Create(path)){await output.WriteAsync(head,ct);await input.CopyToAsync(output,ct);}
  return(name,null);
 }
 [Authorize,HttpPost("me/photo"),RequestSizeLimit(4000000)]
 public async Task<IActionResult> Upload(IFormFile file,CancellationToken ct)
 {
  var(name,error)=await Save(file,3000000,ct);if(error is not null)return error;
  string? previous;try{previous=await service.SetPhoto(name,ct);}catch{System.IO.File.Delete(Path.Combine(Folder,name!));throw;}Remove(previous);return Ok(await service.Mine(ct));
 }
 [Authorize,HttpPost("me/cover"),RequestSizeLimit(7000000)]
 public async Task<IActionResult> UploadCover(IFormFile file,CancellationToken ct)
 {
  var(name,error)=await Save(file,6000000,ct);if(error is not null)return error;
  string? previous;try{previous=await service.SetCover(name,ct);}catch{System.IO.File.Delete(Path.Combine(Folder,name!));throw;}Remove(previous);return Ok(await service.Mine(ct));
 }
 [Authorize,HttpDelete("me/cover")]public async Task<IActionResult> DeleteCover(CancellationToken ct){Remove(await service.SetCover(null,ct));return Ok(await service.Mine(ct));}
 [Authorize,HttpPut("me/frame")]public async Task<IActionResult> Frame(FrameRequest r,CancellationToken ct){await service.SetFrame(r,ct);return Ok(await service.Mine(ct));}
 [HttpGet("{id:guid}/cover")]
 public async Task<IActionResult> CoverImage(Guid id,CancellationToken ct){var name=await service.CoverFile(id,ct);if(name is null||Path.GetFileName(name)!=name)return NotFound();var path=Path.Combine(Folder,name);if(!System.IO.File.Exists(path))return NotFound();return PhysicalFile(path,Path.GetExtension(name) switch{".jpg"=>"image/jpeg",".png"=>"image/png",_=>"image/webp"});}
 [Authorize,HttpDelete("me/photo")]public async Task<IActionResult> DeletePhoto(CancellationToken ct){Remove(await service.SetPhoto(null,ct));return Ok(await service.Mine(ct));}
 [HttpGet("{id:guid}/photo")]
 public async Task<IActionResult> Photo(Guid id,CancellationToken ct){var name=await service.PhotoFile(id,ct);if(name is null||Path.GetFileName(name)!=name)return NotFound();var path=Path.Combine(Folder,name);if(!System.IO.File.Exists(path))return NotFound();return PhysicalFile(path,Path.GetExtension(name) switch{".jpg"=>"image/jpeg",".png"=>"image/png",_=>"image/webp"});}
}
