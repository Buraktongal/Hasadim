CREATE TABLE dbo.RegistrationChallenges (
    Id uniqueidentifier NOT NULL PRIMARY KEY,
    NormalizedEmail nvarchar(256) NOT NULL UNIQUE,
    ProtectedData nvarchar(max) NULL,
    ExpiresAt datetime2 NOT NULL,
    Attempts int NOT NULL DEFAULT 0,
    LastSentAt datetime2 NOT NULL,
    WindowStartedAt datetime2 NOT NULL,
    SendCount int NOT NULL,
    CONSTRAINT CK_RegistrationAttempts CHECK (Attempts BETWEEN 0 AND 5)
);
