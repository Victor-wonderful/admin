-- 0050_product_name_partner.sql — 상품 표시명 '마케터 연회비' → '파트너 멤버십' (표기 규칙: 마케터 → 파트너, 관리자 화면 포함)
update products set name = '파트너 멤버십' where code = 'annual_fee' and name = '마케터 연회비';
