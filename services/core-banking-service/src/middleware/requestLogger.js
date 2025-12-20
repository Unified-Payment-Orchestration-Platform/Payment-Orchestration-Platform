const requestLogger = (serviceName) => {
    return (req, res, next) => {
        const start = Date.now();

        // Hook into response finish
        res.on('finish', () => {
            const duration = Date.now() - start;
            // Prometheus-style log format:
            // service_http_request_duration_seconds_bucket{method="POST",route="/auth/register",status="201",service="AUTH-SERVICE"} 0.045
            console.log(`[${serviceName}] method=${req.method} path=${req.path} status=${res.statusCode} duration=${duration}ms user_agent="${req.get('user-agent')}"`);
        });

        next();
    };
};

module.exports = requestLogger;
