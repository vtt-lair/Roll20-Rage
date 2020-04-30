/* 
 * Version 1.00
 * Original By Werner Dohse
 * Discord: Naudran#2980
 * Roll20: https://app.roll20.net/users/1062502/werner-d
 * Github: https://github.com/werner.dohse/Rage
*/
var Rage = Rage || (function() {
    'use strict';
    
    let isRaging = false;
        
    const version = '0.1',
        totemResistances = 'acid,bludgeoning,cold,fire,force,lightning,necrotic,piercing,poison,radiant,slashing,thunder',
        normalResistances = 'bludgeoning,piercing,slashing',
        rageMarker = 'strong',
    
    
    checkInstall = function () {
      log(`-=> Rage v${version} <=-`);
    },
    
    getEmotePrefix = function () {
        return "/em ";
    },
    
    handleInput = function (msg) {
        if (msg && msg.type === 'api' && msg.content.search(/^!rage\b/) !== -1) {
            if (!msg.selected) {
                handleError(getEmotePrefix(), "A token has to be selected first.");
                return;
            }
            
            const token = getObj('graphic', msg.selected[0]._id);
            const character = getObj('character', token.get('represents'));
            
            if (token && character) {
                const characterName = token.get('name');
                
                const isNPC = checkIfIsNPC(character);
                if (checkIfNeedToRage(character)) {
                    const rageResource = checkIfEnoughRagesLeft(character);
                    
                    if (!rageResource && !isNPC) {
                        handleWarning(getEmotePrefix(), `${characterName} doesn't have enough rages left and cannot rage.`);
                        return;
                    } else {
                        let isRaging = toggleRage(token, character, characterName, true, isNPC);
                    
                        if (isRaging) {
                            toggleRageStatus(token, true);
                            
                            let rageCurrent = 0;
                            let rageMax = 0;
                            if (!isNPC) {
                                rageCurrent = rageResource.get('current');
                                rageMax = rageResource.get('max');
                                
                                rageCurrent--;
                                rageResource.set('current', rageCurrent);
                            }
                        
                            const output = `${getEmotePrefix()}<div style="border:1px solid black;background:#FFF;padding: 5px;border-radius: 8px;margin-left: -40px;"><p>${characterName} rages!</p>${
                                !isNPC 
                                    ? `<div class="sheet-container"><div class="sheet-label"><span style="display: block;">RAGES</span><span style="display: block;">${rageCurrent} OF ${rageMax} REMAINING</span></div></div>`
                                    : ''
                                }</div>`;
                            sendChat('', output, null);    
                        }    
                    }
                    
                } else {
                    let isCalm = toggleRage(token, character, characterName, false, isNPC);
                    
                    if (isCalm) {
                        toggleRageStatus(token, false);
                    
                        const output = `${getEmotePrefix()}<div style="border:1px solid black;background:#ffffff;padding: 5px;border-radius: 8px;margin-left: -40px;"><p>${characterName} is no longer raging.</p></div>`;
                        sendChat('', output, null);    
                    }
                } 
            }
        }
    },
    
    handleError = function (emote, errorMsg) {
      const output =
        `${emote}<div style="border:1px solid black;background:#ffbaba;padding: 5px;border-radius: 8px;margin-left: -40px;">` +
        `<p>${errorMsg}</p></div>`;
      sendChat('', output, { noarchive: true });
    },
    
    handleWarning = function (emote, warningMsg) {
      const output =
        `${emote}<div style="border:1px solid black;background:#c7c7c7;padding: 5px;border-radius: 8px;margin-left: -40px;">` +
        `<p>${warningMsg}</p></div>`;
      sendChat('', output);
    },
    
    checkIfNeedToRage = function (character) {
        const isCharacterRaging = findObjs({
            _type: "attribute",
            _characterid: character.get("_id"),
            name: "is_raging"
        })[0];
        
        if (isCharacterRaging && isCharacterRaging.get('current') === 1) {
            return false;
        } else {
            return true;
        }
    },
    
    checkIfIsNPC = function (character) {
        const isCharacterNPC = findObjs({
            _type: "attribute",
            _characterid: character.get("_id"),
            name: "npc"
        })[0];
        
        if (isCharacterNPC && isCharacterNPC.get('current') === 1) {
            return true;
        } else {
            return false;
        }
    },
    
    checkIfEnoughRagesLeft = function (character) {
        const rageResource = findObjs({
            _type: 'attribute',
            _characterid: character.get('_id'),
            name: 'class_resource',
        })[0];

        if (rageResource) {
            const rageResourceCurrent = rageResource.get('current');
            const rageResourceMax = rageResource.get('max');
            
            if (rageResourceCurrent > 0) {
                return rageResource;
            } else {
                return null;
            }
        }
        
        return null;
    },
    
    getClassResistances = function(character, isNPC) {
        const characterClass = findObjs({
            _type: 'attribute',
            _characterid: character.get('_id'),
            name: 'class',
        })[0];
        
        if (!isNPC && characterClass && characterClass.get('current').toLowerCase() !== 'barbarian') {
            return null;
        }
        
        const subclass = findObjs({
            _type: 'attribute',
            _characterid: character.get('_id'),
            name: 'subclass',
        })[0];
        
        if (subclass && subclass.get('current').toLowerCase().indexOf('totem') > -1) {
            return totemResistances;
        } else {
            return normalResistances;
        }
    },
    
    toggleRage = function (token, character, characterName, wantToRage, isNPC) {
        let isRagingOrCalm = false;
        let prefix = "";
        if (isNPC) {
            prefix = "npc_";
        } else {
            prefix = "pc_";
        }
        
        let resistances = getClassResistances(character, isNPC);
        if (!resistances) {
            handleError(getEmotePrefix(), `${characterName} cannot rage.`);
            return;
        }
        
        const resistanceAttr = findObjs({
            _type: 'attribute',
            _characterid: character.get('_id'),
            name: prefix + 'resistances',
        })[0];
        
        if (resistanceAttr) {
            if (wantToRage) {
                let currentResistances = resistanceAttr.get('current');
                if (currentResistances.length > 0) {
                    currentResistances += '|' + resistances;    
                } else {
                    currentResistances = resistances;    
                }
                
                resistanceAttr.set('current', currentResistances);
                isRagingOrCalm = true;
            } else {
                let currentResistances = resistanceAttr.get('current');
                currentResistances = currentResistances.replace(resistances, '');
                currentResistances = currentResistances.replace('|', '');
                resistanceAttr.set('current', currentResistances);
                
                isRagingOrCalm = true;
            }
        } else {
            if (wantToRage) {
                createObj('attribute', {
                   name: prefix + 'resistances',
                   current: resistances,
                   _characterid: character.get('_id'),
                });
                
                isRagingOrCalm = true;
            }
        }
        
        const ragingAttr = findObjs({
            _type: 'attribute',
            _characterid: character.get('_id'),
            name: 'is_raging',
        })[0];
        
        let rageValue = 0
        if (wantToRage) {
            rageValue = 1;
        }
        
        if (ragingAttr) {
            if (wantToRage) {
                ragingAttr.set('current', rageValue);
            } else {
                ragingAttr.set('current', rageValue);
            }
            
            isRagingOrCalm = true;
        } else {
            createObj('attribute', {
               name: 'is_raging',
               current: rageValue,
               _characterid: character.get('_id'),
            });
            
            isRagingOrCalm = true;
        }
        
        return isRagingOrCalm;
    },
    
    toggleRageStatus = function (token, raging) {
        token.set(`status_${rageMarker}`, raging);
    },
    
    registerEventHandlers = function () {
      on('chat:message', handleInput);
    };
    
    return {
        checkInstall,
        registerEventHandlers,
    };
})();

on('ready', () => {
    'use strict';
    Rage.checkInstall();
    Rage.registerEventHandlers();
});