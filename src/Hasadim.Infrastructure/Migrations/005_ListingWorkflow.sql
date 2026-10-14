ALTER TABLE dbo.Listings ADD
    Status int NOT NULL
        CONSTRAINT DF_Listings_Status DEFAULT (0),

    ReviewNote nvarchar(1000) NULL,
    ReviewedBy uniqueidentifier NULL,

    SubmittedAt datetime2 NULL,
    ReviewedAt datetime2 NULL,

    PublishedAt datetime2 NULL,
    ExpiresAt datetime2 NULL;

-- Yeni sütunları ayrı SQL komutunda kullanıyoruz.
EXEC(N'
    UPDATE dbo.Listings
    SET
        Status = CASE
            WHEN Active = 1 AND IsDeleted = 0 THEN 4
            ELSE 0
        END,
        Active = CASE
            WHEN Active = 1 AND IsDeleted = 0 THEN 1
            ELSE 0
        END;

    ALTER TABLE dbo.Listings
    ADD CONSTRAINT CK_Listings_Status
    CHECK (Status IN (0, 1, 2, 3, 4, 5, 6));

    ALTER TABLE dbo.Listings
    ADD CONSTRAINT CK_Listings_ActiveStatus
    CHECK (
        Active = 0
        OR (Status = 4 AND IsDeleted = 0)
    );

    ALTER TABLE dbo.Listings
    ADD CONSTRAINT FK_Listings_ReviewedBy
    FOREIGN KEY (ReviewedBy) REFERENCES dbo.Users(Id);

    CREATE INDEX IX_Listings_Status_CreatedAt
    ON dbo.Listings(Status, OlusturulmaTarihi DESC);
');