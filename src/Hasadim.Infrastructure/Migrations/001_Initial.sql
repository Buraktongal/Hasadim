CREATE TABLE dbo.Users (
 Id uniqueidentifier NOT NULL PRIMARY KEY, UserName nvarchar(256) NOT NULL, NormalizedUserName nvarchar(256) NOT NULL,
 Email nvarchar(256) NOT NULL, NormalizedEmail nvarchar(256) NOT NULL, EmailConfirmed bit NOT NULL DEFAULT 0,
 PasswordHash nvarchar(max) NULL, SecurityStamp nvarchar(64) NULL, ConcurrencyStamp nvarchar(64) NULL,
 PhoneNumber nvarchar(25) NULL, PhoneNumberConfirmed bit NOT NULL DEFAULT 0,
 TwoFactorEnabled bit NOT NULL DEFAULT 0, LockoutEnd datetimeoffset NULL, LockoutEnabled bit NOT NULL DEFAULT 1,
 AccessFailedCount int NOT NULL DEFAULT 0, DisplayName nvarchar(100) NOT NULL, AuthenticatorKey nvarchar(max) NULL,
 CONSTRAINT UX_Users_Name UNIQUE(NormalizedUserName), CONSTRAINT UX_Users_Email UNIQUE(NormalizedEmail));
CREATE TABLE dbo.Roles(Id uniqueidentifier NOT NULL PRIMARY KEY,Name nvarchar(256) NOT NULL,NormalizedName nvarchar(256) NOT NULL UNIQUE,ConcurrencyStamp nvarchar(64) NULL);
CREATE TABLE dbo.UserRoles(UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),RoleId uniqueidentifier NOT NULL REFERENCES dbo.Roles(Id),PRIMARY KEY(UserId,RoleId));
CREATE TABLE dbo.RecoveryCodes(UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),CodeHash char(64) NOT NULL,PRIMARY KEY(UserId,CodeHash));
CREATE TABLE dbo.Listings(
 Id uniqueidentifier NOT NULL PRIMARY KEY NONCLUSTERED,OwnerId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
 Baslik nvarchar(150) NOT NULL,MeyveTuru nvarchar(100) NOT NULL,Cesit nvarchar(100) NOT NULL,
 MiktarKg decimal(18,2) NOT NULL CHECK(MiktarKg>0),KilogramFiyati decimal(18,2) NOT NULL CHECK(KilogramFiyati>0),
 Il nvarchar(100) NOT NULL,Ilce nvarchar(100) NOT NULL,Aciklama nvarchar(max) NOT NULL,Telefon nvarchar(25) NOT NULL,
 HasatTarihi date NULL,OlusturulmaTarihi datetime2 NOT NULL,Active bit NOT NULL DEFAULT 1,Hidden bit NOT NULL DEFAULT 0,
 IsDeleted bit NOT NULL DEFAULT 0,PhotoUrl nvarchar(200) NULL,Version rowversion NOT NULL);
CREATE UNIQUE CLUSTERED INDEX IX_Listings_Date ON dbo.Listings(OlusturulmaTarihi DESC,Id);
CREATE INDEX IX_Listings_Owner ON dbo.Listings(OwnerId);
CREATE INDEX IX_Listings_Search ON dbo.Listings(IsDeleted,Hidden,Active,MeyveTuru,Il,KilogramFiyati);
CREATE TABLE dbo.Favorites(UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),ListingId uniqueidentifier NOT NULL REFERENCES dbo.Listings(Id),PRIMARY KEY(UserId,ListingId));
CREATE TABLE dbo.Messages(Id uniqueidentifier NOT NULL PRIMARY KEY NONCLUSTERED,ListingId uniqueidentifier NOT NULL REFERENCES dbo.Listings(Id),SenderId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),RecipientId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),Body nvarchar(2000) NOT NULL,CreatedAt datetime2 NOT NULL);
CREATE INDEX IX_Messages_Inbox ON dbo.Messages(RecipientId,CreatedAt DESC);
CREATE INDEX IX_Messages_Sent ON dbo.Messages(SenderId,CreatedAt DESC);
CREATE TABLE dbo.Reports(Id uniqueidentifier NOT NULL PRIMARY KEY,ListingId uniqueidentifier NOT NULL REFERENCES dbo.Listings(Id),UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),Reason nvarchar(1000) NOT NULL,Resolved bit NOT NULL DEFAULT 0,CreatedAt datetime2 NOT NULL);
CREATE UNIQUE INDEX UX_Report_Open ON dbo.Reports(ListingId,UserId) WHERE Resolved=0;
