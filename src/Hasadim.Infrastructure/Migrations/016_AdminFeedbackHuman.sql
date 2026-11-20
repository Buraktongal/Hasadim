SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Öneri ve geri bildirim kutusu.
CREATE TABLE dbo.Feedback (
    Id uniqueidentifier NOT NULL CONSTRAINT PK_Feedback PRIMARY KEY NONCLUSTERED,
    Number int IDENTITY(1001, 1) NOT NULL,
    UserId uniqueidentifier NOT NULL CONSTRAINT FK_Feedback_User REFERENCES dbo.Users(Id),
    Kind nvarchar(20) NOT NULL CONSTRAINT CK_Feedback_Kind CHECK (Kind IN (N'Oneri', N'Hata', N'Diger')),
    Area nvarchar(30) NOT NULL,
    Title nvarchar(150) NOT NULL,
    Body nvarchar(4000) NOT NULL,
    PageUrl nvarchar(300) NULL,
    Client nvarchar(150) NULL,
    Status tinyint NOT NULL CONSTRAINT DF_Feedback_Status DEFAULT 0 CONSTRAINT CK_Feedback_Status CHECK (Status BETWEEN 0 AND 4),
    AdminNote nvarchar(2000) NULL,
    Reply nvarchar(2000) NULL,
    HandledBy uniqueidentifier NULL CONSTRAINT FK_Feedback_Admin REFERENCES dbo.Users(Id),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_Feedback_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2 NULL
);
CREATE CLUSTERED INDEX IX_Feedback_Created ON dbo.Feedback(CreatedAt DESC);
CREATE INDEX IX_Feedback_User ON dbo.Feedback(UserId, CreatedAt DESC);
CREATE INDEX IX_Feedback_Status ON dbo.Feedback(Status, CreatedAt DESC);
CREATE UNIQUE INDEX UX_Feedback_Number ON dbo.Feedback(Number);

-- Yönetici işlemleri kaydı. Değiştirilemez ve silinemez (tetikleyici).
CREATE TABLE dbo.AdminAudit (
    Id bigint IDENTITY(1, 1) NOT NULL CONSTRAINT PK_AdminAudit PRIMARY KEY,
    AdminId uniqueidentifier NOT NULL CONSTRAINT FK_AdminAudit_Admin REFERENCES dbo.Users(Id),
    Action nvarchar(60) NOT NULL,
    TargetType nvarchar(30) NULL,
    TargetId nvarchar(64) NULL,
    Detail nvarchar(1000) NULL,
    Ip nvarchar(64) NULL,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_AdminAudit_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AdminAudit_Created ON dbo.AdminAudit(CreatedAt DESC);
EXEC(N'CREATE TRIGGER dbo.TR_AdminAudit_ReadOnly ON dbo.AdminAudit INSTEAD OF UPDATE, DELETE AS BEGIN THROW 50001, N''Yönetici işlem kaydı değiştirilemez veya silinemez.'', 1; END');

-- Askıya alınan hesaplar (giriş Identity kilidiyle de engellenir; burada gerekçe tutulur).
CREATE TABLE dbo.UserSuspensions (
    UserId uniqueidentifier NOT NULL CONSTRAINT PK_UserSuspensions PRIMARY KEY CONSTRAINT FK_UserSuspensions_User REFERENCES dbo.Users(Id),
    Reason nvarchar(300) NOT NULL,
    AdminId uniqueidentifier NOT NULL CONSTRAINT FK_UserSuspensions_Admin REFERENCES dbo.Users(Id),
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_UserSuspensions_CreatedAt DEFAULT SYSUTCDATETIME()
);

-- İnsan doğrulama biletleri tek kullanımlıktır: kullanılan bilet burada tutulur.
CREATE TABLE dbo.HumanRedemptions (
    Id uniqueidentifier NOT NULL CONSTRAINT PK_HumanRedemptions PRIMARY KEY,
    ExpiresAt datetime2 NOT NULL
);
CREATE INDEX IX_HumanRedemptions_Expires ON dbo.HumanRedemptions(ExpiresAt);
