using Hasadim.Application;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Identity;
using Hasadim.Infrastructure.Repositories;
using Hasadim.Infrastructure.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
namespace Hasadim.DependencyInjection;
public static class ServiceRegistration
{
 public static IServiceCollection AddHasadim(this IServiceCollection services,bool requireConfirmedEmail)
 {
  services.AddSingleton<SqlConnectionFactory>();services.AddScoped<MigrationRunner>();
  services.AddScoped<IProfileRepository,ProfileRepository>();services.AddScoped<ProfileService>();
  services.AddScoped<IMarketplaceRepository,MarketplaceRepository>();services.AddScoped<MarketplaceService>();
  services.AddScoped<MessageNotifications>();
  services.AddScoped<IEngagementRepository,EngagementRepository>();services.AddScoped<EngagementService>();
  services.AddScoped<AccountDeletion>();services.AddScoped<SessionStore>();services.AddScoped<MobileTokenStore>();
  // Bellek önbelleği sınırlı: çok sayıda farklı IP ile belleği doldurma saldırısı engellenir.
  services.AddMemoryCache(o=>o.SizeLimit=200_000);services.AddSingleton<HumanCheck>();
  services.AddScoped<FeedbackRepository>();services.AddScoped<AdminRepository>();
  services.AddScoped<PhoneChallengeStore>();services.AddScoped<QrLoginStore>();services.AddSingleton<ExternalTokenValidator>();
  services.AddScoped<IUserStore<AppUser>,DapperUserStore>();services.AddScoped<IRoleStore<IdentityRole<Guid>>,DapperRoleStore>();
  services.AddIdentity<AppUser,IdentityRole<Guid>>(o=>{
   o.User.RequireUniqueEmail=true;o.Password.RequiredLength=12;o.Password.RequireNonAlphanumeric=false;
   o.Password.RequireDigit=true;o.Password.RequireUppercase=true;o.Password.RequireLowercase=true;
   o.Lockout.DefaultLockoutTimeSpan=TimeSpan.FromMinutes(15);o.Lockout.MaxFailedAccessAttempts=5;
   o.SignIn.RequireConfirmedEmail=requireConfirmedEmail;
  }).AddDefaultTokenProviders();
  services.Configure<PasswordHasherOptions>(o=>o.IterationCount=210000);
  services.Configure<DataProtectionTokenProviderOptions>(o=>o.TokenLifespan=TimeSpan.FromHours(1));
  services.Configure<SecurityStampValidatorOptions>(o=>o.ValidationInterval=TimeSpan.Zero);
  return services;
 }
}
