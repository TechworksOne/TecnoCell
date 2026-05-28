-- Migración: agrega columna "firma" a user_profiles
ALTER TABLE `user_profiles`
  ADD COLUMN `firma` TEXT NULL DEFAULT NULL
  AFTER `foto_perfil`;
