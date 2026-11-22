SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Teslimat artık birden çok seçenek alabilir ("Yerinden teslim, Kargo"); yeni seçenek: Kargo.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Listings') AND name = 'Teslimat' AND max_length < 200)
    ALTER TABLE dbo.Listings ALTER COLUMN Teslimat nvarchar(100) NULL;
