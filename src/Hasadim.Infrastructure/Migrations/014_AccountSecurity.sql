SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Açık oturumlar: her girişte bir kayıt; kullanıcı tek tek kapatabilir.
CREATE TABLE dbo.UserSessions (
    Id uniqueidentifier NOT NULL PRIMARY KEY NONCLUSTERED,
    UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    Method nvarchar(20) NOT NULL,
    Device nvarchar(80) NOT NULL,
    UserAgent nvarchar(300) NULL,
    CreatedAt datetime2 NOT NULL CONSTRAINT DF_UserSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
    LastSeenAt datetime2 NOT NULL CONSTRAINT DF_UserSessions_LastSeenAt DEFAULT SYSUTCDATETIME(),
    EndedAt datetime2 NULL
);
CREATE CLUSTERED INDEX IX_UserSessions_User ON dbo.UserSessions(UserId, LastSeenAt DESC, Id);

-- Giriş hareketleri (başarılı ve başarısız denemeler).
CREATE TABLE dbo.LoginEvents (
    Id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY NONCLUSTERED,
    UserId uniqueidentifier NOT NULL REFERENCES dbo.Users(Id),
    At datetime2 NOT NULL CONSTRAINT DF_LoginEvents_At DEFAULT SYSUTCDATETIME(),
    Success bit NOT NULL,
    Method nvarchar(20) NOT NULL,
    Device nvarchar(80) NOT NULL,
    Reason nvarchar(60) NULL
);
CREATE CLUSTERED INDEX IX_LoginEvents_User ON dbo.LoginEvents(UserId, At DESC, Id);
