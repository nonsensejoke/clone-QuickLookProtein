//
//  SharedFunctions.swift
//  QuickLookProtein
//
//  Created by Jethro Hemmann on 22.08.21.
//

import Foundation
import SwiftUI

func prepare3DmolHTML(htmlPath: String, pdbPath: String, dataFormat: String, atomStyle: Settings.AtomStyle, rotationSpeed: Settings.RotationSpeed, bgColor: Color, orientToWidestFace: Bool = false) -> String {
    var html: String

    do {
        html = try String(contentsOfFile: htmlPath, encoding: .utf8)
        
        let pdb = try String(contentsOfFile: pdbPath)

        let encodedPDB = try String(data: JSONEncoder().encode(pdb), encoding: .utf8)!
        
        html = html.replacingOccurrences(of: "{PDB_DATA}", with: encodedPDB)
    }
    catch {
        html = "Error while loading HTML or PDB"
    }

    html = html.replacingOccurrences(of: "{ATOM_STYLE}", with: String(describing: atomStyle))
    html = html.replacingOccurrences(of: "{BG_COLOR}", with: convertColorToRGB(color: bgColor).rgbHex)
    html = html.replacingOccurrences(of: "{BG_ALPHA}", with: convertColorToRGB(color: bgColor).alpha)
    html = html.replacingOccurrences(of: "{ROTATION_SPEED}", with: String(rotationSpeed.rotationSpeedNumber()))
    html = html.replacingOccurrences(of: "{DATA_FORMAT}", with: dataFormat)
    html = html.replacingOccurrences(of: "{ORIENT_TO_WIDEST_FACE}", with: orientToWidestFace ? "true" : "false")
    
    return html
}

func prepareSMILESHTML(htmlPath: String, smilesPath: String, cdkDepictBaseURL: String, bgColor: Color) -> String {
    var html: String

    do {
        html = try String(contentsOfFile: htmlPath, encoding: .utf8)

        let smiles = try String(contentsOfFile: smilesPath)
        let encodedSMILES = try String(data: JSONEncoder().encode(smiles), encoding: .utf8)!
        let encodedBaseURL = try String(data: JSONEncoder().encode(cdkDepictBaseURL), encoding: .utf8)!
        let color = convertColorToRGB(color: bgColor)
        let rgb = color.rgbHex
        let red = Int(rgb.prefix(2), radix: 16) ?? 255
        let green = Int(rgb.dropFirst(2).prefix(2), radix: 16) ?? 255
        let blue = Int(rgb.dropFirst(4).prefix(2), radix: 16) ?? 255

        html = html.replacingOccurrences(of: "{SMILES_DATA}", with: encodedSMILES)
        html = html.replacingOccurrences(of: "{CDK_DEPICT_BASE_URL}", with: encodedBaseURL)
        html = html.replacingOccurrences(of: "{BG_COLOR_RGB}", with: "\(red), \(green), \(blue)")
        html = html.replacingOccurrences(of: "{BG_ALPHA}", with: color.alpha)
    }
    catch {
        html = "Error while loading SMILES HTML or data"
    }

    return html
}


// https://gist.github.com/gobijan/d724de27e2aff8131676
func convertColorToRGB(color: Color) -> (rgbHex: String, alpha: String) {
    let nsColor: NSColor = NSColor(color)
    
    // convert to CIColor to prevent crash when using colors of a different color space
    // https://stackoverflow.com/questions/15682923/convert-nscolor-to-rgb
    let ciColor: CIColor = CIColor(color: nsColor)!
    
    let rInt = Int((ciColor.red * 255.99999))
    let gInt = Int((ciColor.green * 255.99999))
    let bInt = Int((ciColor.blue * 255.99999))
    
    let alpha = ciColor.alpha
    
    // Convert the numbers to hex strings
    let rHex = String(format:"%02X", rInt)
    let gHex = String(format:"%02X", gInt)
    let bHex = String(format:"%02X", bInt)
    
    let hexColor = rHex+gHex+bHex
    
    return (hexColor, "\(alpha)")
}
