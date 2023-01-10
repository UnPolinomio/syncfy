import { getAuthorizationCode, AUTHORIZE_REDIRECT_URI } from "../utils/authServer"

const AUTHORIZE_API_URL = 'https://accounts.google.com/o/oauth2/v2'
const OAUTH_API_URL = 'https://oauth2.googleapis.com'

const SCOPES = [
    'https://www.googleapis.com/auth/youtube'
]

export class YoutubeService {
    accessToken: string | undefined

    async init() {
        const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
        if (!refreshToken) throw new Error('No refresh token')

        const response = await fetch(`${OAUTH_API_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.YOUTUBE_CLIENT_ID!,
                client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        })
        if(!response.ok) throw new Error('Failed to refresh token')
        const data = await response.json()
        this.accessToken = data.access_token
    }

    static async authenticate() {
        const state = Math.random().toString(36).substring(2, 15)
            + Math.random().toString(36).substring(2, 15)
        const url = new URL(`${AUTHORIZE_API_URL}/auth`)
        url.searchParams.append('client_id', process.env.YOUTUBE_CLIENT_ID!)
        url.searchParams.append('response_type', 'code')
        url.searchParams.append('redirect_uri', AUTHORIZE_REDIRECT_URI)
        url.searchParams.append('state', state)
        url.searchParams.append('scope', SCOPES.join(' '))
        url.searchParams.append('access_type', 'offline')

        const code = await getAuthorizationCode({ authUrl: url.toString(), state })
        const response = await fetch(`${OAUTH_API_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.YOUTUBE_CLIENT_ID!,
                client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: AUTHORIZE_REDIRECT_URI // 
            })
        })
        const data = await response.json()
        console.log({ data })
    }
}
