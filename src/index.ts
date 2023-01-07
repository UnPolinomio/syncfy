import { SpotifyService } from "./services/SpotifyService"

const spotifyService = new SpotifyService()
await spotifyService.init()
console.log(await spotifyService.getUserPlaylists())
