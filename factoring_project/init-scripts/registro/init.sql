-- Crear usuario
\c registro_db

-- Tabla users
CREATE TABLE public.users (
    id serial PRIMARY KEY,
    email varchar(255) UNIQUE NOT NULL,
    password_hash varchar(255) NOT NULL,
    full_name varchar(255) NOT NULL,
    dni varchar(20) UNIQUE NOT NULL,
    phone varchar(30),
    role varchar(50),
    verification_status varchar(50),
    is_active bool,
    failed_login_attempts int,
    is_locked bool,
    locked_until timestamp,
    last_login_at timestamp,
    created_at timestamp,
    updated_at timestamp
);

-- Tabla companies
CREATE TABLE public.companies (
    id serial PRIMARY KEY,
    ruc varchar(11) UNIQUE NOT NULL,
    business_name varchar(255) NOT NULL,
    legal_representative_user_id int NOT NULL UNIQUE REFERENCES public.users(id),
    bank_name varchar(100) NOT NULL,
    bank_account_number varchar(50) NOT NULL,
    cci varchar(20) NOT NULL,
    currency varchar(10),
    created_at timestamp,
    updated_at timestamp
);

-- Tabla company_documents
CREATE TABLE public.company_documents (
    id serial PRIMARY KEY,
    company_id int NOT NULL REFERENCES public.companies(id),
    document_type varchar(50) NOT NULL,
    file_name varchar(255) NOT NULL,
    file_path text NOT NULL,
    uploaded_at timestamp
);
