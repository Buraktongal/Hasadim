SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Profil kapak fotoğrafı ve fotoğrafların kadrajı (odak noktası yüzde olarak, yakınlaştırma yüzde 100-300).
IF COL_LENGTH('dbo.UserProfiles', 'CoverFile') IS NULL
    ALTER TABLE dbo.UserProfiles ADD CoverFile nvarchar(100) NULL;
IF COL_LENGTH('dbo.UserProfiles', 'PhotoX') IS NULL
    ALTER TABLE dbo.UserProfiles ADD
        PhotoX tinyint NOT NULL CONSTRAINT DF_UserProfiles_PhotoX DEFAULT 50,
        PhotoY tinyint NOT NULL CONSTRAINT DF_UserProfiles_PhotoY DEFAULT 50,
        PhotoZoom smallint NOT NULL CONSTRAINT DF_UserProfiles_PhotoZoom DEFAULT 100,
        CoverX tinyint NOT NULL CONSTRAINT DF_UserProfiles_CoverX DEFAULT 50,
        CoverY tinyint NOT NULL CONSTRAINT DF_UserProfiles_CoverY DEFAULT 50,
        CoverZoom smallint NOT NULL CONSTRAINT DF_UserProfiles_CoverZoom DEFAULT 100;
EXEC(N'IF OBJECT_ID(N''dbo.CK_UserProfiles_Frame'') IS NULL
    ALTER TABLE dbo.UserProfiles ADD CONSTRAINT CK_UserProfiles_Frame CHECK
        (PhotoX <= 100 AND PhotoY <= 100 AND CoverX <= 100 AND CoverY <= 100
         AND PhotoZoom BETWEEN 100 AND 300 AND CoverZoom BETWEEN 100 AND 300)');
