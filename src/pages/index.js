import VideoUploader from '../components/VideoUploader'
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Video Uploader AI - Generate Short Clips</title>
        <meta name="description" content="Upload videos and generate AI-powered short clips" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Video Uploader AI
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upload your videos and let AI generate engaging short clips for social media
            </p>
          </header>
          
          <VideoUploader />
        </div>
      </main>
    </>
  )
}
