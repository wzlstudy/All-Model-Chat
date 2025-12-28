
import { useState, useEffect, Dispatch, SetStateAction, useMemo } from 'react';
import { ChatMessage, SavedScenario, SavedChatSession, AppSettings } from '../types';
import { generateUniqueId, generateSessionTitle, logService, createNewSession } from '../utils/appUtils';
import { DEFAULT_CHAT_SETTINGS, DEFAULT_SYSTEM_INSTRUCTION } from '../constants/appConstants';
import { dbService } from '../utils/db';
import { getScenariosApi, saveScenarioApi, deleteScenarioApi } from '../services/api/sparkxChatApi';
import {
    fopScenario,
    unrestrictedScenario,
    pyriteScenario,
    annaScenario,
    voxelScenario,
    reasonerScenario,
    succinctScenario,
    socraticScenario,
    formalScenario,
    SYSTEM_SCENARIO_IDS
} from '../constants/defaultScenarios';

type SessionsUpdater = (updater: (prev: SavedChatSession[]) => SavedChatSession[], options?: { persist?: boolean }) => Promise<void>;

interface PreloadedScenariosProps {
    appSettings: AppSettings;
    setAppSettings: Dispatch<SetStateAction<AppSettings>>;
    updateAndPersistSessions: SessionsUpdater;
    setActiveSessionId: Dispatch<SetStateAction<string | null>>;
}

export const usePreloadedScenarios = ({ appSettings, setAppSettings, updateAndPersistSessions, setActiveSessionId }: PreloadedScenariosProps) => {
    const [userSavedScenarios, setUserSavedScenarios] = useState<SavedScenario[]>([]);

    useEffect(() => {
        const loadScenarios = async () => {
            try {
                // 1. Load from Local DB first for immediate UI
                const storedScenarios = await dbService.getAllScenarios();
                let localScenarios = storedScenarios;

                // 2. Fetch from Backend to sync
                const remoteScenariosMapped = await getScenariosApi();
                // Map backend Entity to frontend SavedScenario if necessary
                const remoteScenarios: SavedScenario[] = remoteScenariosMapped.map((s: any) => ({
                    id: s.scenarioId,
                    title: s.title,
                    systemInstruction: s.systemInstruction,
                    messages: s.messages
                }));

                // 3. Seed Jailbreak Scenarios if missing (local first run)
                const hasSeededJailbreaks = localStorage.getItem('hasSeededJailbreaks_v1');
                if (!hasSeededJailbreaks) {
                    const jailbreaks = [fopScenario, unrestrictedScenario, pyriteScenario];
                    localScenarios = [...localScenarios, ...jailbreaks.filter(jb => !localScenarios.some(s => s.id === jb.id))];
                }

                // 4. Seed Anna Scenario
                const hasSeededAnna = localStorage.getItem('hasSeededAnna_v1');
                if (!hasSeededAnna) {
                    localScenarios = [...localScenarios, ...[annaScenario].filter(a => !localScenarios.some(s => s.id === a.id))];
                }

                // Merge remote into local (remote wins if same ID)
                let finalScenarios = [...localScenarios];
                remoteScenarios.forEach(rs => {
                    const idx = finalScenarios.findIndex(fs => fs.id === rs.id);
                    if (idx > -1) {
                        finalScenarios[idx] = rs;
                    } else {
                        finalScenarios.push(rs);
                    }
                });

                // Update Local and State
                await dbService.setAllScenarios(finalScenarios);
                setUserSavedScenarios(finalScenarios);

                // Mark seeded
                if (!hasSeededJailbreaks) localStorage.setItem('hasSeededJailbreaks_v1', 'true');
                if (!hasSeededAnna) localStorage.setItem('hasSeededAnna_v1', 'true');

                // Proactively sync seeded scenarios to backend if they were just added
                if (!hasSeededJailbreaks || !hasSeededAnna) {
                    const scenariosToSync = finalScenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));
                    await Promise.all(scenariosToSync.map(s => saveScenarioApi({
                        scenarioId: s.id,
                        title: s.title,
                        systemInstruction: s.systemInstruction,
                        messages: s.messages
                    })));
                }

            } catch (error) {
                logService.error("Error loading preloaded scenarios:", { error });
            }
        };
        loadScenarios();
    }, []);

    const savedScenarios = useMemo(() => {
        // Ensure user-saved scenarios don't conflict with the default IDs
        const filteredUserScenarios = userSavedScenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));
        return [
            // FOP, Unrestricted, Pyrite, Anna are now in filteredUserScenarios
            voxelScenario,
            reasonerScenario,
            succinctScenario,
            socraticScenario,
            formalScenario,
            ...filteredUserScenarios
        ];
    }, [userSavedScenarios]);

    const handleSaveAllScenarios = async (updatedScenarios: SavedScenario[]) => {
        // Filter out the default scenarios so they are not saved to the user's database
        const scenariosToSync = updatedScenarios.filter(s => !SYSTEM_SCENARIO_IDS.includes(s.id));

        // Find deleted scenarios
        const currentIds = userSavedScenarios.map(s => s.id);
        const newIds = scenariosToSync.map(s => s.id);
        const deletedIds = currentIds.filter(id => !newIds.includes(id));

        setUserSavedScenarios(scenariosToSync);
        await dbService.setAllScenarios(scenariosToSync).catch(error => {
            logService.error("Failed to save scenarios to DB", { error });
        });

        // Sync to Backend
        try {
            // 1. Save/Update new and existing
            await Promise.all(scenariosToSync.map(s => saveScenarioApi({
                scenarioId: s.id,
                title: s.title,
                systemInstruction: s.systemInstruction,
                messages: s.messages
            })));

            // 2. Delete removed
            await Promise.all(deletedIds.map(id => deleteScenarioApi(id)));
        } catch (error) {
            logService.error("Failed to sync scenarios to backend", { error });
        }
    };

    const handleLoadPreloadedScenario = (scenarioToLoad: SavedScenario) => {
        const messages: ChatMessage[] = scenarioToLoad.messages.map(pm => ({
            ...pm,
            id: generateUniqueId(),
            timestamp: new Date()
        }));

        const systemInstruction = scenarioToLoad.systemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION;

        // Create a new session from scratch with the scenario's data
        const sessionSettings = {
            ...DEFAULT_CHAT_SETTINGS, // Start with defaults
            ...appSettings,          // Layer on current app settings
            systemInstruction,       // Override with scenario's system instruction
        };

        const title = scenarioToLoad.title || generateSessionTitle(messages) || 'New Chat';

        const newSession = createNewSession(sessionSettings, messages, title);

        updateAndPersistSessions(prev => [newSession, ...prev.filter(s => s.messages.length > 0)]);
        setActiveSessionId(newSession.id);
        dbService.setActiveSessionId(newSession.id);

        // Also update the global/default system prompt in app settings
        setAppSettings(prev => ({
            ...prev,
            systemInstruction,
        }));
    };

    return {
        savedScenarios,
        handleSaveAllScenarios,
        handleLoadPreloadedScenario,
    };
};
