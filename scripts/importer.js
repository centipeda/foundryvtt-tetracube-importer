import { getActorData, getFeatureData } from "./actor.js";

class TetraCubeImporter {
    static ID = "tetracube-importer";
    static TEMPLATES = {
        IMPORTER: `modules/${this.ID}/templates/importer.hbs`
    }
}

class TetraCubeImporterForm extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overrides = {
            height: 'auto',
            id: 'tetracube-importer',
            template: TetraCubeImporter.TEMPLATES.IMPORTER,
            title: 'Import Statblock',
        };
    
        return foundry.utils.mergeObject(defaults, overrides);
    }

    async _updateObject(event, formData) {
        let monsterData = {};

        // Parse data from .monster JSON.
        try {
            monsterData = JSON.parse(formData.text);
            console.log('accepted input', monsterData);
        } catch (exception) {
            console.log(exception);
            if(exception instanceof SyntaxError) {
                ui.notifications.error("Invalid Monster statblock data.");
            } else {
                ui.notifications.error("Failed to import statblock.");
            }
            return;
        }

        // Create actor.
        let actor = await Actor.create({
            name: monsterData.name,
            type: 'npc',
            sort: 12000,
            data: getActorData(monsterData)
        });

        // Add monster features as actor items.
        if(!getFeatureData(monsterData, actor)) {
            await actor.delete();
            return;
        }

        // Show created actor sheet.
        actor.sheet.render(true);
    }
}

// Add button for import form to actors sidebar.
Hooks.on("renderActorDirectory", async (app, html, data) => {
    const actions = html.find("div.header-actions");
    actions.append("<button type='button' class='tetracube-import-button' title='Import a creature from a Tetra-Cube statblock.'><i class='fas fa-cubes'></i>Tetra-Cube Import</button>");
    html.on('click', '.tetracube-import-button', (event) => {
        new TetraCubeImporterForm().render(true);
    });
});
