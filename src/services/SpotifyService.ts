import { getAuthorizationCode, AUTHORIZE_REDIRECT_URI } from "../utils/authServer"

const API_URL = 'https://api.spotify.com/v1'
const AUTHORIZE_API_URL = 'https://accounts.spotify.com'

const SCOPES = [
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-private'
]

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
        url.searchParams.append('scope', SCOPES.join(' '))

        const code = await getAuthorizationCode({ authUrl: url.toString(), state })
        const response = await fetch(`${AUTHORIZE_API_URL}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer
                    .from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET)
                    .toString('base64')
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                redirect_uri: AUTHORIZE_REDIRECT_URI
            })
        })

        const data = await response.json()
        console.log(data)
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

    async addTracksToPlaylist(playlistId: string, uris: string[]) {
        const response = await fetch(`${API_URL}/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris
            })
        })
        if (!response.ok) throw new Error('Failed to add tracks to playlist')
    }

    async removePlaylistTracks(playlistId: string, tracks: { uri: string }[]) {
        const response = await fetch(`${API_URL}/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracks: tracks.map(track => ({ uri: track.uri }))
            })
        })
        if (!response.ok) throw new Error('Failed to remove tracks from playlist')
    }
}
