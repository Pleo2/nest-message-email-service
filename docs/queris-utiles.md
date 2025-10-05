-- OTPs generados por día
SELECT DATE(created_at), COUNT(\*)
FROM otps
GROUP BY DATE(created_at);

-- Tasa de verificación exitosa
SELECT
COUNT(_) FILTER (WHERE verified = true) _ 100.0 / COUNT(\*) as success_rate
FROM otps;

-- Aplicaciones más usadas
SELECT application*id, COUNT(*)
FROM otps
GROUP BY application*id
ORDER BY COUNT(*) DESC;

-- Promedio de intentos antes de verificar
SELECT AVG(attempts)
FROM otps
WHERE verified = true;

-- OTPs bloqueados en últimas 24h
SELECT COUNT(\*)
FROM otps
WHERE blocked = true
AND created_at > NOW() - INTERVAL '24 hours';
