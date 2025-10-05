# Linux, WSL or MacOS

### Paso 1: Otorgar permisos al script `dev-db.sh`

```bash
$ chmod +x prod-db.sh
```

### Paso 2: Iniciar el script

```bash
$  ./prod-db.sha
```

#### Comandos disponibles ✅

```bash
./prod-db.sh start          # Iniciar ambas BD
./prod-db.sh stop           # Detener ambas BD
./prod-db.sh restart        # Reiniciar ambas BD
./prod-db.sh status         # Ver estado
./prod-db.sh logs           # Ver logs de ambas
./prod-db.sh logs postgres  # Ver solo logs de PostgreSQL
./prod-db.sh logs redis     # Ver solo logs de Redis
./prod-db.sh clean          # Limpiar todo (⚠️ borra datos)
./prod-db.sh psql           # Conectar a PostgreSQL
./prod-db.sh redis          # Conectar a Redis
./prod-db.sh help           # Ver ayuda
```

# Windows (PowerShell)

- Paso 1: Run the script
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -File .\prod-db.ps1
    ```

### Comandos disponibles ✅

```powershell
# Windows PowerShell
.\prod-db.ps1 start          # Iniciar ambas BD
.\prod-db.ps1 stop           # Detener ambas BD
.\prod-db.ps1 restart        # Reiniciar ambas BD
.\prod-db.ps1 status         # Ver estado
.\prod-db.ps1 logs           # Ver logs de ambas
.\prod-db.ps1 logs postgres  # Ver solo logs de PostgreSQL
.\prod-db.ps1 logs redis     # Ver solo logs de Redis
.\prod-db.ps1 clean          # Limpiar todo (⚠️ borra datos)
.\prod-db.ps1 psql           # Conectar a PostgreSQL
.\prod-db.ps1 redis          # Conectar a Redis
.\prod-db.ps1 help           # Ver ayuda
```
