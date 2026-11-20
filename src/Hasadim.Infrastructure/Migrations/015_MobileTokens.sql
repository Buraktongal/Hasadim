SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Mobil uygulama oturum anahtarları. Anahtarların kendisi değil, yalnızca SHA-256 özetleri saklanır.
-- Her mobil giriş bir UserSessions kaydına bağlıdır; oturum kapatılınca anahtarlar da geçersizleşir.
CREATE TABLE dbo.MobileTokens (
    SessionId uniqueidentifier NOT NULL PRIMARY KEY
        CONSTRAINT FK_MobileTokens_Session REFERENCES dbo.UserSessions(Id) ON DELETE CASCADE,
    UserId uniqueidentifier NOT NULL CONSTRAINT FK_MobileTokens_User REFERENCES dbo.Users(Id),
    AccessHash binary(32) NOT NULL,
    AccessExpiresAt datetime2 NOT NULL,
    RefreshHash binary(32) NOT NULL,
    RefreshExpiresAt datetime2 NOT NULL,
    PreviousRefreshHash binary(32) NULL,
    SecurityStamp nvarchar(64) NULL,
    RotatedAt datetime2 NOT NULL CONSTRAINT DF_MobileTokens_RotatedAt DEFAULT SYSUTCDATETIME()
);
CREATE UNIQUE INDEX UX_MobileTokens_Access ON dbo.MobileTokens(AccessHash);
CREATE UNIQUE INDEX UX_MobileTokens_Refresh ON dbo.MobileTokens(RefreshHash);
CREATE INDEX IX_MobileTokens_Previous ON dbo.MobileTokens(PreviousRefreshHash) WHERE PreviousRefreshHash IS NOT NULL;
CREATE INDEX IX_MobileTokens_User ON dbo.MobileTokens(UserId);
