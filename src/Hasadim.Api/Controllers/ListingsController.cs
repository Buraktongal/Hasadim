using System.Text;
using System.Text.Json;
using Hasadim.Application;
using Hasadim.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hasadim.Api.Controllers;

[ApiController]
[Route("api/meyve-ilanlari")]
public class ListingsController(
    MarketplaceService service,
    IWebHostEnvironment env) : ControllerBase
{
    private const long MaxPhotoSize = 5_000_000;
    private const long MaxUploadSize = 52_000_000;

    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private string Folder =>
        Path.Combine(env.ContentRootPath, "App_Data", "photos");

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] ListingQuery query,
        CancellationToken ct)
    {
        return Ok(await service.Search(query, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(
        Guid id,
        CancellationToken ct)
    {
        return Ok(await service.Detail(id, ct));
    }

    // Fotoğrafsız eski oluşturma endpoint'i yayın yapamaz.
    [Authorize]
    [HttpPost]
    public IActionResult Create()
    {
        return BadRequest(new
        {
            mesaj =
                "İlan oluştururken en az bir fotoğraf ekleyin. " +
                "with-photos endpoint'ini kullanın."
        });
    }

    [Authorize]
    [HttpPost("with-photos")]
    [RequestSizeLimit(MaxUploadSize)]
    public async Task<IActionResult> CreateWithPhotos(
        [FromForm] string listing,
        [FromForm] List<IFormFile> files,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(listing))
        {
            return BadRequest(new
            {
                mesaj = "İlan bilgileri gerekli."
            });
        }

        ListingRequest? request;

        try
        {
            request = JsonSerializer.Deserialize<ListingRequest>(
                listing,
                JsonOptions
            );
        }
        catch (JsonException)
        {
            return BadRequest(new
            {
                mesaj = "İlan bilgileri geçerli JSON biçiminde değil."
            });
        }

        if (request is null)
        {
            return BadRequest(new
            {
                mesaj = "İlan bilgileri gerekli."
            });
        }

        if (!TryValidateModel(request))
        {
            return ValidationProblem(ModelState);
        }

        var names = await SaveFiles(files, ct);

        Guid id;

        try
        {
            var photoReferences = names
                .Select(name =>
                    "/api/meyve-ilanlari/photo-file/" + name)
                .ToArray();

            // Application/Core katmanları yeni ilanı taslak oluşturur.
            id = await service.Create(request, ct, photoReferences);
        }
        catch
        {
            Cleanup(names);
            throw;
        }

        return CreatedAtAction(
            nameof(Detail),
            new { id },
            new
            {
                id,
                mesaj = "İlan taslak olarak kaydedildi."
            }
        );
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] ListingRequest request,
        CancellationToken ct)
    {
        await service.Update(id, request, ct);

        return Ok(new
        {
            id,
            mesaj = "İlan bilgileri güncellendi."
        });
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken ct)
    {
        await service.Delete(id, ct);

        return NoContent();
    }

    // İlan sahibi: taslak veya düzeltme bekleyen ilanı gönderir.
    [Authorize]
    [HttpPost("{id:guid}/submit-review")]
    public async Task<IActionResult> SubmitForReview(
        Guid id,
        [FromBody] ListingWorkflowRequest request,
        CancellationToken ct)
    {
        await service.SubmitForReview(id, request, ct);

        return Ok(new
        {
            id,
            mesaj = "İlan incelemeye gönderildi."
        });
    }

    [Authorize]
    [HttpPost("{id:guid}/sold")]
    public async Task<IActionResult> MarkAsSold(
        Guid id,
        [FromBody] ListingWorkflowRequest request,
        CancellationToken ct)
    {
        await service.MarkAsSold(id, request, ct);

        return Ok(new
        {
            id,
            mesaj = "İlan satıldı olarak işaretlendi."
        });
    }

    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<IActionResult> Favorite(
        Guid id,
        CancellationToken ct)
    {
        await service.Favorite(id, true, ct);

        return Ok();
    }

    [Authorize]
    [HttpDelete("{id:guid}/favorite")]
    public async Task<IActionResult> Unfavorite(
        Guid id,
        CancellationToken ct)
    {
        await service.Favorite(id, false, ct);

        return NoContent();
    }

    [Authorize]
    [HttpPost("{id:guid}/report")]
    public async Task<IActionResult> Report(
        Guid id,
        [FromBody] ReportRequest request,
        CancellationToken ct)
    {
        await service.Report(id, request.Reason, ct);

        return Ok(new
        {
            mesaj = "Bildiriminiz alındı."
        });
    }

    [Authorize]
    [HttpPost("{id:guid}/photos")]
    [RequestSizeLimit(MaxUploadSize)]
    public async Task<IActionResult> Photos(
        Guid id,
        [FromForm] List<IFormFile> files,
        CancellationToken ct)
    {
        await service.CheckOwner(id, ct);

        // Uygun olmayan ilanda dosyaları diske yazmadan reddet.
        var listing = await service.Detail(id, ct);

        if (listing.Status != ListingStatus.Draft &&
            listing.Status != ListingStatus.ChangesRequested)
        {
            throw new AppException(
                409,
                "Bu durumdaki ilanın fotoğrafları değiştirilemez."
            );
        }

        var names = await SaveFiles(files, ct);

        try
        {
            var photoReferences = names
                .Select(name =>
                    "/api/meyve-ilanlari/photo-file/" + name)
                .ToArray();

            // Application ve Repository durumu yeniden kontrol eder.
            await service.AddPhotos(id, photoReferences, ct);
        }
        catch
        {
            Cleanup(names);
            throw;
        }

        return Ok(new
        {
            id,
            mesaj = "Fotoğraflar eklendi."
        });
    }

    [HttpGet("{id:guid}/photo")]
    public async Task<IActionResult> GetPhoto(
        Guid id,
        [FromQuery] string? file,
        CancellationToken ct)
    {
        // Taslak/gizli/süresi dolmuş ilan erişimini kontrol eder.
        var listing = await service.Detail(id, ct);

        string? url;

        if (file is null)
        {
            url = listing.Photos.FirstOrDefault()?.Url;
        }
        else
        {
            // Eski fotoğraf adresleriyle uyumluluk.
            url = listing.Photos
                .Select(photo => photo.Url)
                .FirstOrDefault(value =>
                    value.EndsWith(
                        "file=" + file,
                        StringComparison.Ordinal
                    ));
        }

        if (url is null)
        {
            return NotFound();
        }

        return ImageFile(ExtractFileName(url));
    }

    [HttpGet("{id:guid}/photos/{photoId:guid}")]
    public async Task<IActionResult> GetGalleryPhoto(
        Guid id,
        Guid photoId,
        CancellationToken ct)
    {
        var listing = await service.Detail(id, ct);

        var photo = listing.Photos.FirstOrDefault(
            item => item.Id == photoId
        );

        if (photo is null)
        {
            return NotFound();
        }

        return ImageFile(ExtractFileName(photo.Url));
    }

    private static string ExtractFileName(string url)
    {
        return url.Split("file=").Last().Split('/').Last();
    }

    private IActionResult ImageFile(string name)
    {
        if (string.IsNullOrWhiteSpace(name) ||
            Path.GetFileName(name) != name ||
            name.Contains('/') ||
            name.Contains('\\'))
        {
            return NotFound();
        }

        var mime = Path.GetExtension(name).ToLowerInvariant() switch
        {
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => null
        };

        if (mime is null)
        {
            return NotFound();
        }

        var path = Path.Combine(Folder, name);

        if (!System.IO.File.Exists(path))
        {
            return NotFound();
        }

        return PhysicalFile(path, mime);
    }

    private void Cleanup(IEnumerable<string> names)
    {
        foreach (var name in names)
        {
            try
            {
                System.IO.File.Delete(Path.Combine(Folder, name));
            }
            catch (IOException)
            {
                // Temizleme hatası asıl işlem hatasını örtmesin.
            }
            catch (UnauthorizedAccessException)
            {
                // Temizleme hatası asıl işlem hatasını örtmesin.
            }
        }
    }

    private async Task<List<string>> SaveFiles(
        List<IFormFile> files,
        CancellationToken ct)
    {
        if (files.Count < 1 || files.Count > 10)
        {
            throw new AppException(
                400,
                "1–10 fotoğraf seçin."
            );
        }

        Directory.CreateDirectory(Folder);

        var names = new List<string>();

        try
        {
            foreach (var file in files)
            {
                if (file.Length < 12 || file.Length > MaxPhotoSize)
                {
                    throw new AppException(
                        400,
                        "Fotoğraf dosyası geçerli olmalı ve 5 MB'ı aşmamalıdır."
                    );
                }

                await using var input = file.OpenReadStream();

                var header = new byte[12];

                await input.ReadExactlyAsync(header, ct);

                var extension = DetectExtension(header);

                if (extension is null)
                {
                    throw new AppException(
                        400,
                        "JPG, PNG veya WebP fotoğraf seçin."
                    );
                }

                // Kullanıcının gönderdiği dosya adı kullanılmaz.
                var name = Guid.NewGuid().ToString("N") + extension;

                names.Add(name);

                var path = Path.Combine(Folder, name);

                await using var output = System.IO.File.Create(path);

                await output.WriteAsync(header, ct);
                await input.CopyToAsync(output, ct);
            }

            return names;
        }
        catch
        {
            Cleanup(names);
            throw;
        }
    }

    private static string? DetectExtension(byte[] header)
    {
        if (header[0] == 255 &&
            header[1] == 216 &&
            header[2] == 255)
        {
            return ".jpg";
        }

        byte[] pngSignature =
        [
            137, 80, 78, 71, 13, 10, 26, 10
        ];

        if (header.AsSpan(0, 8).SequenceEqual(pngSignature))
        {
            return ".png";
        }

        if (Encoding.ASCII.GetString(header, 0, 4) == "RIFF" &&
            Encoding.ASCII.GetString(header, 8, 4) == "WEBP")
        {
            return ".webp";
        }

        return null;
    }
}