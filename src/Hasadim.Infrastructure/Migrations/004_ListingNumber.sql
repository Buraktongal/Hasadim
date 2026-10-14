SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

-- Sıra numarasını 10 haneli, sıfır içermeyen numaraya çevirir.
EXEC(N'
CREATE FUNCTION dbo.MakeListingNumber
(
    @SequenceNumber bigint
)
RETURNS bigint
WITH SCHEMABINDING
AS
BEGIN
    DECLARE @Capacity bigint = 3486784401;

    IF @SequenceNumber IS NULL
       OR @SequenceNumber < 0
       OR @SequenceNumber >= @Capacity
        RETURN NULL;

    DECLARE @Value bigint =
        (@SequenceNumber * CAST(1000000007 AS bigint)
         + CAST(1729384610 AS bigint)) % @Capacity;

    DECLARE @Result bigint = 0;
    DECLARE @Place bigint = 1;
    DECLARE @Index int = 0;

    WHILE @Index < 10
    BEGIN
        SET @Result = @Result + ((@Value % 9) + 1) * @Place;
        SET @Value = @Value / 9;
        SET @Place = @Place * 10;
        SET @Index = @Index + 1;
    END;

    RETURN @Result;
END;
');

-- İçeride kullanılan otomatik sıra numarası.
ALTER TABLE dbo.Listings
ADD ListingSequence bigint IDENTITY(0, 1) NOT NULL;

-- Kullanıcıya gösterilen numara.
EXEC(N'
ALTER TABLE dbo.Listings
ADD ListingNumber AS
    dbo.MakeListingNumber(ListingSequence) PERSISTED;
');

-- Aynı ilan numarasının tekrar kullanılmasını engeller.
EXEC(N'
CREATE UNIQUE INDEX UX_Listings_ListingNumber
ON dbo.Listings(ListingNumber);
');

-- Kullanılabilir sayı aralığının aşılmasını engeller.
EXEC(N'
ALTER TABLE dbo.Listings
ADD CONSTRAINT CK_Listings_ListingSequence
CHECK (ListingSequence BETWEEN 0 AND 3486784400);
');