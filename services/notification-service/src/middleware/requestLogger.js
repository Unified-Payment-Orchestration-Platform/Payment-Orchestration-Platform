const requestLogger = (serviceName) => {
    return (req, res, next) => {
        const start = Date.now();

        // Hook into response finish
        res.on('finish', () => {
            const duration = Date.now() - start;
            // Prometheus-style log format:
            console.log(`[${serviceName}] method=${req.method} path=${req.originalUrl || req.url} status=${res.statusCode} duration=${duration}ms user_agent="${req.get('user-agent') || '-'}"`);
        });

        next();
    };
};

module.exports = requestLogger;
