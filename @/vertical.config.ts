export default {
  // existing properties...
}

// or, if config is being imported elsewhere
import config from './config'

try {
  // Use config here
} catch (error) {
  console.error('Error loading config:', error)
  // Optionally, return a default config or rethrow
}