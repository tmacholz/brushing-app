import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import { AdminLayout } from './admin/components/AdminLayout.tsx'
import { WorldList } from './admin/screens/WorldList.tsx'
import { WorldEditor } from './admin/screens/WorldEditor.tsx'
import { StoryEditor } from './admin/screens/StoryEditor.tsx'
import { PetManager } from './admin/screens/PetManager.tsx'
import { PetAudioManager } from './admin/screens/PetAudioManager.tsx'
import { ExpressionEditor } from './admin/screens/ExpressionEditor.tsx'
import { SpriteManager } from './admin/screens/SpriteManager.tsx'
import { CollectiblesManager } from './admin/screens/CollectiblesManager.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="worlds" replace />} />
            <Route path="worlds" element={<WorldList />} />
            <Route path="worlds/:worldId" element={<WorldEditor />} />
            <Route path="worlds/:worldId/stories/:storyId" element={<StoryEditor />} />

            {/* Character management */}
            <Route path="characters/expressions" element={<ExpressionEditor type="characters" />} />
            <Route path="characters/sprites" element={<SpriteManager type="characters" />} />

            {/* Pet management */}
            <Route path="pets" element={<PetManager />} />
            <Route path="pets/expressions" element={<ExpressionEditor type="pets" />} />
            <Route path="pets/sprites" element={<SpriteManager type="pets" />} />
            <Route path="pets/audio" element={<PetAudioManager />} />

            {/* Assets */}
            <Route path="collectibles" element={<CollectiblesManager />} />
          </Route>

          {/* User app routes */}
          <Route path="/*" element={<App />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
