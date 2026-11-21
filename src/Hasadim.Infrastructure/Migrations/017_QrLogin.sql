SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Mobil uygulamayla QR kod okutarak web'de giriş.
-- Web sayfası bir istek açar; QR'daki kod ve tarayıcıya verilen gizli anahtar yalnızca SHA-256 özetleriyle saklanır.
-- Durum: 0 bekliyor, 1 telefonda okutuldu, 2 onaylandı, 3 reddedildi, 4 kullanıldı (tarayıcı giriş yaptı).
CREATE TABLE dbo.QrLogins (
    Id uniqueidentifier NOT NULL CONSTRAINT PK_QrLogins PRIMARY KEY NONCLUSTERED,
    CodeHash binary(32) NOT NULL,
    SecretHash binary(32) NOT NULL,
    BrowserDevice nvarchar(100) NOT NULL,
    BrowserIp nvarchar(64) NULL,
    Status tinyint NOT NULL CONSTRAINT DF_QrLogins_Status DEFAULT 0 CONSTRAINT CK_QrLogins_Status CHECK (Status BETWEEN 0 AND 4),
    UserId uniqueidentifier NULL CONSTRAINT FK_QrLogins_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    ApproverSession uniqueidentifier NULL,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_QrLogins_Created DEFAULT SYSUTCDATETIME(),
    ExpiresAt datetime2 NOT NULL,
    DecidedAt datetime2 NULL
);
CREATE UNIQUE INDEX UX_QrLogins_Code ON dbo.QrLogins(CodeHash);
CREATE CLUSTERED INDEX IX_QrLogins_Created ON dbo.QrLogins(CreatedAt);
