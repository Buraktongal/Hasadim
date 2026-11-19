SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Google / Apple ile giriş: sağlayıcı hesabı ↔ Hasadım kullanıcısı.
CREATE TABLE dbo.UserLogins (
    LoginProvider nvarchar(32) NOT NULL,
    ProviderKey nvarchar(256) NOT NULL,
    ProviderDisplayName nvarchar(64) NULL,
    UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_UserLogins_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserLogins PRIMARY KEY (LoginProvider, ProviderKey)
);
CREATE INDEX IX_UserLogins_User ON dbo.UserLogins(UserId);

-- SMS kodları (telefonla giriş ve telefon doğrulama). Kodun kendisi değil özeti saklanır.
CREATE TABLE dbo.PhoneChallenges (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    Purpose nvarchar(16) NOT NULL,
    Phone nvarchar(20) NOT NULL,
    UserId uniqueidentifier NULL REFERENCES dbo.Users(Id),
    CodeHash char(64) NOT NULL,
    ExpiresAt datetime2 NOT NULL,
    Attempts int NOT NULL CONSTRAINT DF_PhoneChallenges_Attempts DEFAULT 0,
    Used bit NOT NULL CONSTRAINT DF_PhoneChallenges_Used DEFAULT 0,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_PhoneChallenges_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_PhoneChallenges_Purpose CHECK (Purpose IN ('login', 'verify')),
    CONSTRAINT CK_PhoneChallenges_Attempts CHECK (Attempts BETWEEN 0 AND 5)
);
CREATE INDEX IX_PhoneChallenges_Phone ON dbo.PhoneChallenges(Phone, CreatedAt DESC);

-- Doğrulanmış bir telefon numarası yalnızca bir hesaba ait olabilir.
EXEC(N'CREATE UNIQUE INDEX UX_Users_ConfirmedPhone ON dbo.Users(PhoneNumber) WHERE PhoneNumberConfirmed = 1 AND PhoneNumber IS NOT NULL;');
