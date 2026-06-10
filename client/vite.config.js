export default {
    root: 'src',
    publicDir: '../public',
    build: {
        outDir: '../../dist',
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true,
            }
        }
    }
}
