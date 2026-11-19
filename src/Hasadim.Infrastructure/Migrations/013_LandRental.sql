SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Arazi ilanları satılık veya kiralık olabilir. Kiralıkta fiyat yıllık kira bedelidir.
ALTER TABLE dbo.Listings ADD IslemTipi nvarchar(10) NULL;
EXEC(N'ALTER TABLE dbo.Listings ADD CONSTRAINT CK_Listings_IslemTipi CHECK (IslemTipi IS NULL OR IslemTipi IN (N''Satilik'',N''Kiralik''))');
EXEC(N'UPDATE dbo.Listings SET IslemTipi = N''Satilik'' WHERE Kategori = N''Arazi'' AND IslemTipi IS NULL');
