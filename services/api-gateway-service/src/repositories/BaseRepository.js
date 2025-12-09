class BaseRepository {
    constructor(db) {
        this.db = db;
    }

    // Common methods like findAll, findById could be generic here if tables followed a strict pattern
    // For now, it serves as a structural base
}

module.exports = BaseRepository;
