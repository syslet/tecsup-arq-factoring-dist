-- Crear usuario
\c venta_db

-- Tabla sales
CREATE TABLE public.sales (
    id serial PRIMARY KEY,
    total_amount float8 NOT NULL,
    advance_amount float8 NOT NULL,
    advance_rate float8 NOT NULL,
    pricing_rate float8 NOT NULL,
    pricing_timestamp varchar(50) NOT NULL,
    monto_final float8 NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla invoice_sheets
CREATE TABLE public.invoice_sheets (
    id serial PRIMARY KEY,
    company_id int NOT NULL,
    sheet_code varchar(50) UNIQUE NOT NULL,
    currency varchar(10),
    total_amount float8 NOT NULL,
    advance_amount float8 NOT NULL,
    interest_fee float8 NOT NULL,
    commission float8 NOT NULL,
    net_disbursement float8 NOT NULL,
    advance_rate float8,
    monthly_rate float8,
    status varchar(50),
    created_at timestamp
);

-- Tabla invoices
CREATE TABLE public.invoices (
    id serial PRIMARY KEY,
    sheet_id int NOT NULL REFERENCES public.invoice_sheets(id),
    invoice_number varchar(50) NOT NULL,
    drawer_ruc varchar(11) NOT NULL,
    debtor_ruc varchar(11) NOT NULL,
    debtor_name varchar(255) NOT NULL,
    amount float8 NOT NULL,
    currency varchar(10) NOT NULL,
    issue_date timestamp NOT NULL,
    due_date timestamp NOT NULL,
    days_to_maturity int NOT NULL,
    sunat_status varchar(20),
    is_approved bool,
    rejection_reason text
);
