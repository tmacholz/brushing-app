import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AdminLayout } from './admin/components/AdminLayout.tsx'
import { WorldList } from './admin/screens/WorldList.tsx'
import { WorldEditor } from './admin/screens/WorldEditor.tsx'
import { StoryEditor } from './admin/screens/StoryEditor.tsx'
import { PetManager } from './admin/screens/PetManager.tsx'
import { PetAudioManager } from './admin/screens/PetAudioManager.tsx'
import { PoseEditor } from './admin/screens/PoseEditor.tsx'
import { SpriteManager } from './admin/screens/SpriteManager.tsx'
import { CollectiblesManager } from './admin/screens/CollectiblesManager.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="worlds" replace />} />
          <Route path="worlds" element={<WorldList />} />
          <Route path="worlds/:worldId" element={<WorldEditor />} />
          <Route path="worlds/:worldId/stories/:storyId" element={<StoryEditor />} />
          <Route path="pets" element={<PetManager />} />
          <Route path="pets/audio" element={<PetAudioManager />} />
          <Route path="characters/poses" element={<PoseEditor />} />
          <Route path="characters/sprites" element={<SpriteManager />} />
          <Route path="collectibles" element={<CollectiblesManager />} />
        </Route>

        {/* User app routes */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
