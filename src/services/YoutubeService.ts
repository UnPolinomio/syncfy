import { getAuthorizationCode, AUTHORIZE_REDIRECT_URI } from "../utils/authServer"

const API_URL = 'https://www.googleapis.com/youtube/v3'
const AUTHORIZE_API_URL = 'https://accounts.google.com/o/oauth2/v2'
const OAUTH_API_URL = 'https://oauth2.googleapis.com'

const SCOPES = [
    'https://www.googleapis.com/auth/youtube'
]

export class YoutubeService {
    private constructor(protected accessToken: string) { }

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
                redirect_uri: AUTHORIZE_REDIRECT_URI
            })
        })
        if(!response.ok) throw new Error('Failed to get refresh token: ' + await response.text())
        const data = await response.json()

        return { refreshToken: data.refresh_token, accessToken: data.access_token }
    }

    static async getAccessToken(refreshToken: string) {
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
        if(!response.ok) throw new Error('Failed to refresh token: ' + await response.text())
        const data = await response.json()

        return data.access_token
    }

    static async init() {
        const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
        
        if(!refreshToken) {
            const { accessToken } = await YoutubeService.authenticate()
            return new YoutubeService(accessToken)
        }

        try {
            const accessToken = await YoutubeService.getAccessToken(refreshToken)
            return new YoutubeService(accessToken)
        } catch (e: any) {
            if(!e.message.includes('invalid_grant')) throw e
            const { accessToken }= await YoutubeService.authenticate()
            return new YoutubeService(accessToken)
        }
    }

    async addTrackToPlaylist(playlistId: string, videoId: string) {
        const url = new URL(`${API_URL}/playlistItems`)
        url.searchParams.append('part', 'snippet')
        
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                snippet: {
                    playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId
                    }
                }
            })
        })
        if(!response.ok) throw new Error('Failed to add track to playlist: ' + await response.text())
    }

    async removeTrackFromPlaylist(playlistItemId: string) {
        const url = new URL(`${API_URL}/playlistItems`)
        url.searchParams.append('id', playlistItemId)

        const response = await fetch(url.toString(), {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        })
        if(!response.ok) throw new Error('Failed to remove track from playlist: ' + await response.text())
    }
}
