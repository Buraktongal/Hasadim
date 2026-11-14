using Dapper;
using Hasadim.Application;
using Hasadim.DependencyInjection;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Identity;
using Hasadim.Infrastructure.Repositories;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.ComponentModel.DataAnnotations;

static class SecurityRegression
{
    public static async Task Run(IConfiguration config, SqlConnectionFactory factory, Action<bool, string> check)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(config);
        services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
        services.AddHttpContextAccessor();
        services.AddHasadim(requireConfirmedEmail: true);
        await using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var sp = scope.ServiceProvider;
        sp.GetRequiredService<IHttpContextAccessor>().HttpContext = new DefaultHttpContext { RequestServices = sp };
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        var signIn = sp.GetRequiredService<SignInManager<AppUser>>();
        var store = sp.GetRequiredService<IUserStore<AppUser>>();
        var roles = sp.GetRequiredService<IRoleStore<IdentityRole<Guid>>>();
        var account = new AppUser { UserName = "security@example.test", Email = "security@example.test", DisplayName = "O'Connor", EmailConfirmed = true };
        const string password = "TestOnlySecure123!";
        check((await users.CreateAsync(account, password)).Succeeded, "Güvenlik testi hesabı gerçek Identity ayarlarıyla oluşturulur");
        check((await signIn.CheckPasswordSignInAsync(account, password, true)).Succeeded, "Doğru parola doğrulanır");
        await using var sql = await factory.Open();
        await sql.ExecuteAsync("UPDATE dbo.Listings SET ExpiresAt=DATEADD(day,1,SYSUTCDATETIME()) WHERE Status=4");
        var role = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "SecurityMember", NormalizedName = "SECURITYMEMBER" };
        check((await roles.CreateAsync(role, default)).Succeeded, "Rol sorguları için gerçek test rolü oluşturulur");
        check((await users.AddToRoleAsync(account, role.Name)).Succeeded, "Test hesabına yalnızca test rolü atanır");
        var userCount = await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Users");
        var listingCount = await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Listings");
        string[] attacks = ["' or '='1", "' OR '1'='1' --", "security@example.test' OR 1=1--", "'; DROP TABLE dbo.Users;--", "' UNION SELECT NULL--"];
        var repo = new MarketplaceRepository(factory);
        check((await repo.Search(new ListingQuery(), null, default)).Total > 0, "Saldırı aramaları boş olmayan ilan tablosunda sınanır");
        foreach (var attack in attacks)
        {
            check(await users.FindByEmailAsync(attack) is null, "SQL girdisi e-posta üzerinden hesap seçemez");
            check(await users.FindByNameAsync(attack) is null, "SQL girdisi kullanıcı adı üzerinden hesap seçemez");
            check(await store.FindByIdAsync(attack, default) is null, "SQL girdisi hesap kimliği olamaz");
            check(await roles.FindByNameAsync(attack, default) is null, "SQL girdisi rol seçemez");
            check(!await users.IsInRoleAsync(account, attack), "SQL girdisi yönetici rolü kazandıramaz");
            var result = await repo.Search(new ListingQuery { Q = attack }, null, default);
            check(result.Total == 0, "SQL girdisi arama koşulunu değiştiremez");
            check((await repo.Search(new ListingQuery { Il = attack }, null, default)).Total == 0, "SQL girdisi konum filtresini aşamaz");
            check((await repo.Search(new ListingQuery { MeyveTuru = attack }, null, default)).Total == 0, "SQL girdisi ürün filtresini aşamaz");
            // Test repository defense even when API/model validation is deliberately skipped.
            await repo.Search(new ListingQuery { Sort = attack }, null, default);
            var invalidSort = new ListingQuery { Sort = attack };
            check(!Validator.TryValidateObject(invalidSort, new ValidationContext(invalidSort), [], true), "Geçersiz sıralama API doğrulamasında reddedilir");
            var fresh = (await users.FindByIdAsync(account.Id.ToString()))!;
            check(!(await signIn.CheckPasswordSignInAsync(fresh, attack, true)).Succeeded, "SQL girdisi parola kontrolünü aşamaz");
        }
        var locked = (await users.FindByIdAsync(account.Id.ToString()))!;
        check(await users.IsLockedOutAsync(locked), "Beş hatalı parola hesabı kilitler");
        check((await signIn.CheckPasswordSignInAsync(locked, password, true)).IsLockedOut, "Kilitliyken doğru parola da giriş sağlayamaz");
        check(await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Users") == userCount &&
            await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Listings") == listingCount, "Saldırı denemeleri tabloları veya kayıt sayılarını değiştirmez");
        check((await users.FindByEmailAsync(account.Email!))?.DisplayName == "O'Connor", "İsimlerde meşru tek tırnak korunur");
        // An unconfirmed account must not pass even with the right password.
        var pending = new AppUser { UserName = "pending-security@example.test", Email = "pending-security@example.test", DisplayName = "Pending" };
        check((await users.CreateAsync(pending, password)).Succeeded, "Doğrulanmamış test hesabı oluşturulur");
        check((await signIn.CheckPasswordSignInAsync(pending, password, true)).IsNotAllowed, "E-posta doğrulanmadan doğru parola da giriş sağlayamaz");
    }
}
