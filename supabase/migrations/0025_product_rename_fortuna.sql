-- 0025. 제품명 통일: 구독 상품 "AI 트레이딩 봇 구독" → "포르투나 구독" (브랜드 개명 반영).
update products set name = '포르투나 구독' where code = 'bot_sub';
