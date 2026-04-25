const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// ==========================================
// KONFIGURASI KONEKSI POSTGRESQL (pg)
// ==========================================
const pool = new Pool({
    user: 'postgres',       // Ganti dengan username postgres Anda
    host: 'localhost',
    database: 'taskdb',     // Ganti dengan nama database Anda
    password: 'root',       // Ganti dengan password postgres Anda
    port: 5432,
});

// Middleware untuk mem-parsing body JSON
app.use(express.json());

// ==========================================
// MIDDLEWARE LOGGING (Wajib)
// ==========================================
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// ==========================================
// ENDPOINTS
// ==========================================

// 1. GET /tasks - Mengambil semua daftar tugas
app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// 2. GET /tasks/:id - Mengambil satu tugas berdasarkan ID (Error Handling 404)
app.get('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// 3. POST /tasks - Menambah tugas baru (Validasi Input 400)
app.post('/tasks', async (req, res) => {
    const { title, description } = req.body;

    // Validasi Input: title tidak boleh kosong atau hanya spasi
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title tidak boleh kosong' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
            [title, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// 4. PUT /tasks/:id - Mengupdate data tugas (Error Handling 404)
app.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, is_completed } = req.body;

    try {
        // Cek apakah data dengan ID tersebut ada sebelum diupdate
        const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
        }

        const result = await pool.query(
            'UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), is_completed = COALESCE($3, is_completed) WHERE id = $4 RETURNING *',
            [title, description, is_completed, id]
        );
        
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// 5. DELETE /tasks/:id - Menghapus tugas (Error Handling 404)
app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: `Gagal menghapus. Tugas dengan ID ${id} tidak terdaftar` });
        }
        
        res.status(200).json({ message: `Tugas dengan ID ${id} berhasil dihapus` });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// Jalankan Server
app.listen(port, () => {
    console.log(`Server Task Manager berjalan di http://localhost:${port}`);
});