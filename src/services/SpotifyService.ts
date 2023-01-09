import { createServer } from "http"

const API_URL = 'https://api.spotify.com/v1'
const AUTHORIZE_API_URL = 'https://accounts.spotify.com'
const AUTHORIZE_PORT = 41263
const AUTHORIZE_REDIRECT_URI = 'https://unpolinomio-automatic-eureka-vqvvxvrgj7v2xj7w-41263.preview.app.github.dev/'

export class SpotifyService {
    accessToken: string | undefined

    async init() {
        const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN
        if (!refreshToken) throw new Error('No refresh token')

        const response = await fetch(`${AUTHORIZE_API_URL}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        })
        if(! response.ok) throw new Error('Failed to refresh token')
        const data = await response.json()
        this.accessToken = data.access_token
    }

    static async authenticate() {
        const state = Math.random().toString(36).substring(2, 15)
            + Math.random().toString(36).substring(2, 15)
        const url = new URL(`${AUTHORIZE_API_URL}/authorize`)
        url.searchParams.append('client_id', process.env.SPOTIFY_CLIENT_ID!)
        url.searchParams.append('response_type', 'code')
        url.searchParams.append('redirect_uri', AUTHORIZE_REDIRECT_URI)
        url.searchParams.append('state', state)
        url.searchParams.append('scope', 'playlist-modify-private')

        const server = createServer(async (req, res) => {
            const url = new URL(req.url!, `http://${req.headers.host}`)
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')
            const returnedState = url.searchParams.get('state')
            if (returnedState !== state) {
                res.writeHead(400, 'Invalid state')
                res.end()
                server.close()
                return
            }

            if (error) {
                res.writeHead(400, error)
                res.end()
                server.close()
                return
            }

            if (!code) {
                res.writeHead(400, 'Invalid code')
                res.end()
                server.close()
                return
            }

            const response = await fetch(`${AUTHORIZE_API_URL}/api/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
                },
                body: new URLSearchParams({
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: AUTHORIZE_REDIRECT_URI
                })
            })

            const data = await response.json()
            console.log(data)
            res.writeHead(200, 'OK')
            res.end()
            server.close()
        })

        server.listen(AUTHORIZE_PORT, () => {
            console.log(`Log in to Spotify at ${url.toString()}`)
        })
    }

    async getPlaylistTracks(playlistId: string) {
        let next = new URL(`${API_URL}/playlists/${playlistId}/tracks`)
        const items = []
        do {
            const response = await fetch(next, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            })
            if (!response.ok) throw new Error('Failed to get playlist tracks')
            const data = await response.json()
            items.push(...data.items)
            next = data.next
        } while(next !== null)

        return items
    }
}
