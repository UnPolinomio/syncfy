import { createServer } from "http"

const AUTHORIZE_PORT = 41263
export const AUTHORIZE_REDIRECT_URI = 'https://unpolinomio-automatic-eureka-vqvvxvrgj7v2xj7w-41263.preview.app.github.dev/'

interface GetAuthorizationCodeOptions {
    authUrl: string
    state: string
}

export function getAuthorizationCode({ authUrl, state }: GetAuthorizationCodeOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const server = createServer(async (req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`)
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')
            const returnedState = url.searchParams.get('state')
            if (returnedState !== state) {
                res.writeHead(400, 'Invalid state')
                res.end()
                server.close()
                return reject(new Error('Invalid state'))
            }
    
            if (error) {
                res.writeHead(400, error)
                res.end()
                server.close()
                return reject(new Error(error))
            }
    
            if (!code) {
                res.writeHead(400, 'Invalid code')
                res.end()
                server.close()
                return reject(new Error('Invalid code'))
            }      
    
            res.writeHead(200, 'OK')
            res.end()
            server.close()

            resolve(code)
        })
    
        server.listen(AUTHORIZE_PORT, () => {
            console.log(`Log in at: ${authUrl}`)
        })
    })
}
