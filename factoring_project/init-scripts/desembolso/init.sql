-- Crear usuario
\c desembolso_db

-- Tabla disbursements
CREATE TABLE public.disbursements (
    id serial PRIMARY KEY,
    sheet_id int NOT NULL UNIQUE,
    annotation_code varchar(100) UNIQUE NOT NULL,
    amount float8 NOT NULL,
    currency varchar(10),
    bank_name varchar(100) NOT NULL,
    bank_account_number varchar(50) NOT NULL,
    cci varchar(20) NOT NULL,
    status varchar(50),
    executed_at timestamp
);
