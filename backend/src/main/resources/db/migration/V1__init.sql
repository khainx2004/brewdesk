-- BrewDesk — schema khởi tạo
-- Quy ước: PK là UUID, tiền DECIMAL(12,0) (VNĐ nguyên), tồn kho DECIMAL(12,3),
-- thời gian TIMESTAMPTZ, xóa mềm bằng is_active / is_cancelled.

-- ============================================================
-- Ca làm việc & tài khoản
-- ============================================================

CREATE TABLE shift_types (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(10)  NOT NULL UNIQUE,
    name          VARCHAR(50)  NOT NULL,
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    display_order INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username             VARCHAR(50)  NOT NULL UNIQUE,
    password_hash        VARCHAR(100) NOT NULL,
    full_name            VARCHAR(100) NOT NULL,
    role                 VARCHAR(20)  NOT NULL,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'STAFF'))
);

-- Chấm công: quán hiện tại không dùng, giữ bảng để mở rộng sau.
CREATE TABLE shifts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id),
    shift_type_id UUID        NOT NULL REFERENCES shift_types(id),
    work_date     DATE        NOT NULL,
    check_in_at   TIMESTAMPTZ,
    check_out_at  TIMESTAMPTZ,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shifts UNIQUE (user_id, work_date, shift_type_id)
);

-- ============================================================
-- Danh mục dùng chung
-- ============================================================

CREATE TABLE units (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(20)   NOT NULL UNIQUE,
    name              VARCHAR(50)   NOT NULL,
    base_unit_id      UUID          REFERENCES units(id),
    conversion_factor DECIMAL(12,3) NOT NULL DEFAULT 1,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_units_factor CHECK (conversion_factor > 0)
);

CREATE TABLE ingredient_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(30) NOT NULL UNIQUE,
    name          VARCHAR(50) NOT NULL,
    display_order INT         NOT NULL DEFAULT 0,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    display_order INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- Kho
-- ============================================================

CREATE TABLE suppliers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(150) NOT NULL,
    phone      VARCHAR(20),
    address    TEXT,
    note       TEXT,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE ingredients (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_category_id UUID          NOT NULL REFERENCES ingredient_categories(id),
    unit_id                UUID          NOT NULL REFERENCES units(id),
    name                   VARCHAR(150)  NOT NULL,
    stock_qty              DECIMAL(12,3) NOT NULL DEFAULT 0,
    low_stock_threshold    DECIMAL(12,3) NOT NULL DEFAULT 0,
    cost_price             DECIMAL(12,0) NOT NULL DEFAULT 0,
    is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_ingredients_stock     CHECK (stock_qty >= 0),
    CONSTRAINT chk_ingredients_threshold CHECK (low_stock_threshold >= 0),
    CONSTRAINT chk_ingredients_cost      CHECK (cost_price >= 0)
);

CREATE INDEX idx_ingredients_category ON ingredients(ingredient_category_id);
CREATE INDEX idx_ingredients_low_stock ON ingredients(stock_qty) WHERE is_active;

-- ============================================================
-- Menu
-- ============================================================

CREATE TABLE menu_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id   UUID          NOT NULL REFERENCES categories(id),
    name          VARCHAR(150)  NOT NULL,
    description   TEXT,
    price         DECIMAL(12,0) NOT NULL,
    is_combo      BOOLEAN       NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    display_order INT           NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_menu_items_price CHECK (price >= 0)
);

CREATE INDEX idx_menu_items_category ON menu_items(category_id) WHERE is_active;

-- Chỉ 3 mức 0% / 50% / 100% cho cả độ ngọt và đá — ràng buộc cứng ở DB.
CREATE TABLE variants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_type  VARCHAR(30) NOT NULL,
    level_value   INT         NOT NULL,
    display_name  VARCHAR(50) NOT NULL,
    display_order INT         NOT NULL DEFAULT 0,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_variants_type  CHECK (variant_type IN ('SWEETNESS_LEVEL', 'ICE_LEVEL')),
    CONSTRAINT chk_variants_level CHECK (level_value IN (0, 50, 100)),
    CONSTRAINT uq_variants UNIQUE (variant_type, level_value)
);

-- Quan hệ N-N tự thân: 1 combo gồm nhiều món con.
CREATE TABLE combo_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id      UUID NOT NULL REFERENCES menu_items(id),
    child_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity      INT  NOT NULL DEFAULT 1,
    CONSTRAINT chk_combo_items_qty  CHECK (quantity > 0),
    CONSTRAINT chk_combo_items_self CHECK (combo_id <> child_item_id),
    CONSTRAINT uq_combo_items UNIQUE (combo_id, child_item_id)
);

-- Cầu nối bắt buộc menu_items <-> ingredients, dùng để trừ kho khi bán.
CREATE TABLE recipes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID          NOT NULL REFERENCES menu_items(id),
    ingredient_id UUID         NOT NULL REFERENCES ingredients(id),
    quantity     DECIMAL(12,3) NOT NULL,
    unit_id      UUID          NOT NULL REFERENCES units(id),
    CONSTRAINT chk_recipes_qty CHECK (quantity > 0),
    CONSTRAINT uq_recipes UNIQUE (menu_item_id, ingredient_id)
);

CREATE INDEX idx_recipes_menu_item ON recipes(menu_item_id);

-- ============================================================
-- Nhập kho & kiểm kê
-- ============================================================

CREATE TABLE stock_imports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID          NOT NULL REFERENCES ingredients(id),
    supplier_id   UUID          REFERENCES suppliers(id),
    unit_id       UUID          NOT NULL REFERENCES units(id),
    batch_code    VARCHAR(50),
    quantity      DECIMAL(12,3) NOT NULL,
    unit_cost     DECIMAL(12,0) NOT NULL DEFAULT 0,
    total_cost    DECIMAL(12,0) NOT NULL DEFAULT 0,
    expiry_date   DATE,
    imported_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    imported_by   UUID          NOT NULL REFERENCES users(id),
    note          TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_stock_imports_qty  CHECK (quantity > 0),
    CONSTRAINT chk_stock_imports_cost CHECK (unit_cost >= 0 AND total_cost >= 0)
);

CREATE INDEX idx_stock_imports_ingredient ON stock_imports(ingredient_id);
CREATE INDEX idx_stock_imports_batch ON stock_imports(batch_code);

CREATE TABLE stock_take_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date  DATE        NOT NULL,
    shift_type_id UUID        REFERENCES shift_types(id),
    performed_by  UUID        NOT NULL REFERENCES users(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    CONSTRAINT chk_sts_status CHECK (status IN ('DRAFT', 'COMPLETED'))
);

-- Chênh lệch = actual_qty - system_qty, tính ở app, không lưu cột riêng.
CREATE TABLE stock_take_lines (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID          NOT NULL REFERENCES stock_take_sessions(id) ON DELETE CASCADE,
    ingredient_id UUID          NOT NULL REFERENCES ingredients(id),
    system_qty    DECIMAL(12,3) NOT NULL DEFAULT 0,
    actual_qty    DECIMAL(12,3) NOT NULL DEFAULT 0,
    note          TEXT,
    CONSTRAINT chk_stl_qty CHECK (system_qty >= 0 AND actual_qty >= 0),
    CONSTRAINT uq_stl UNIQUE (session_id, ingredient_id)
);

-- ============================================================
-- POS
-- ============================================================

-- discount_value không được vượt subtotal — validate ở Service layer,
-- không đặt CHECK ở DB vì logic PERCENT và FIXED khác nhau.
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code      VARCHAR(30)   NOT NULL UNIQUE,
    shift_type_id   UUID          REFERENCES shift_types(id),
    created_by      UUID          NOT NULL REFERENCES users(id),
    subtotal        DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_type   VARCHAR(20),
    discount_value  DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    total           DECIMAL(12,0) NOT NULL DEFAULT 0,
    payment_method  VARCHAR(20)   NOT NULL,
    note            TEXT,
    is_cancelled    BOOLEAN       NOT NULL DEFAULT FALSE,
    cancelled_at    TIMESTAMPTZ,
    cancelled_by    UUID          REFERENCES users(id),
    cancel_reason   TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_orders_discount_type CHECK (discount_type IS NULL OR discount_type IN ('PERCENT', 'FIXED')),
    CONSTRAINT chk_orders_payment       CHECK (payment_method IN ('CASH', 'TRANSFER')),
    CONSTRAINT chk_orders_amounts       CHECK (subtotal >= 0 AND discount_value >= 0
                                               AND discount_amount >= 0 AND total >= 0)
);

CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_active ON orders(created_at DESC) WHERE NOT is_cancelled;
CREATE INDEX idx_orders_shift_type ON orders(shift_type_id);

-- unit_price và item_name là ảnh chụp TẠI THỜI ĐIỂM bán,
-- không tham chiếu ngược menu_items.price.
CREATE TABLE order_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID          NOT NULL REFERENCES orders(id),
    menu_item_id         UUID          NOT NULL REFERENCES menu_items(id),
    item_name            VARCHAR(150)  NOT NULL,
    unit_price           DECIMAL(12,0) NOT NULL,
    quantity             INT           NOT NULL,
    line_total           DECIMAL(12,0) NOT NULL,
    sweetness_variant_id UUID          REFERENCES variants(id),
    ice_variant_id       UUID          REFERENCES variants(id),
    note                 TEXT,
    CONSTRAINT chk_oi_price CHECK (unit_price >= 0),
    CONSTRAINT chk_oi_qty   CHECK (quantity > 0),
    CONSTRAINT chk_oi_total CHECK (line_total >= 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- ============================================================
-- Checklist
-- ============================================================

CREATE TABLE checklist_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    frequency     VARCHAR(20)  NOT NULL,
    shift_type_id UUID         REFERENCES shift_types(id),
    display_order INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_ct_frequency CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'FLEXIBLE'))
);

-- 1 dòng = 1 lần tick cho 1 ngày.
CREATE TABLE checklist_completions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID        NOT NULL REFERENCES checklist_templates(id),
    completion_date DATE        NOT NULL,
    shift_type_id   UUID        REFERENCES shift_types(id),
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    note            TEXT,
    CONSTRAINT uq_cc UNIQUE (template_id, completion_date)
);

CREATE INDEX idx_cc_date ON checklist_completions(completion_date DESC);

-- N-N: nhiều nhân viên cùng làm 1 task.
CREATE TABLE checklist_completion_staff (
    completion_id UUID NOT NULL REFERENCES checklist_completions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (completion_id, user_id)
);

-- ============================================================
-- QC test cafe
-- ============================================================

CREATE TABLE qc_test_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date  DATE        NOT NULL,
    shift_type_id UUID        NOT NULL REFERENCES shift_types(id),
    dose_type     VARCHAR(10) NOT NULL,
    performed_by  UUID        NOT NULL REFERENCES users(id),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_qts_dose CHECK (dose_type IN ('SINGLE', 'DOUBLE'))
);

CREATE INDEX idx_qts_date ON qc_test_sessions(session_date DESC);

-- stock_import_id để truy vết chất lượng theo lô hàng đã nhập.
CREATE TABLE qc_tests (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID          NOT NULL REFERENCES qc_test_sessions(id) ON DELETE CASCADE,
    stock_import_id    UUID          REFERENCES stock_imports(id),
    dose_gram          DECIMAL(12,3),
    yield_gram         DECIMAL(12,3),
    extraction_seconds INT,
    grind_setting      VARCHAR(50),
    acidity            INT           NOT NULL,
    body               INT           NOT NULL,
    sweetness          INT           NOT NULL,
    note               TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_qc_scores CHECK (acidity BETWEEN 1 AND 5
                                    AND body BETWEEN 1 AND 5
                                    AND sweetness BETWEEN 1 AND 5),
    CONSTRAINT chk_qc_measures CHECK ((dose_gram IS NULL OR dose_gram > 0)
                                      AND (yield_gram IS NULL OR yield_gram > 0)
                                      AND (extraction_seconds IS NULL OR extraction_seconds > 0))
);

-- ============================================================
-- Bàn giao ca
-- ============================================================

CREATE TABLE shift_cash_reconciliations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_date DATE        NOT NULL,
    shift_type_id       UUID        NOT NULL REFERENCES shift_types(id),
    handed_over_by      UUID        NOT NULL REFERENCES users(id),
    received_by         UUID        REFERENCES users(id),
    note                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_scr UNIQUE (reconciliation_date, shift_type_id)
);

-- Đúng 3 dòng mỗi phiếu: POS (máy ghi nhận) / TT (thực đếm) / CHI (đã chi).
-- Chênh lệch = TT - POS - CHI, tính ở app, không lưu cột riêng.
CREATE TABLE shift_cash_lines (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID          NOT NULL REFERENCES shift_cash_reconciliations(id) ON DELETE CASCADE,
    line_type         VARCHAR(10)   NOT NULL,
    amount            DECIMAL(12,0) NOT NULL DEFAULT 0,
    note              TEXT,
    CONSTRAINT chk_scl_type   CHECK (line_type IN ('POS', 'TT', 'CHI')),
    CONSTRAINT chk_scl_amount CHECK (amount >= 0),
    CONSTRAINT uq_scl UNIQUE (reconciliation_id, line_type)
);

-- ============================================================
-- Audit
-- ============================================================

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID,
    detail      JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
