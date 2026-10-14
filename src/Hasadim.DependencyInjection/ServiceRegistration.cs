using Hasadim.Application;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Identity;
using Hasadim.Infrastructure.Repositories;
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
