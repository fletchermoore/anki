import { Card } from "../../models/Card";
import { MdParser } from "./mdParser";


export class NestedHeaderParser {
    private reverseRegex = /^#+\s<>/

    public async parse(content: string): Promise<Card[]> {
        const lines = content.split(/\r\n|\r|\n/);
        let backSide: string[] = [];
        let frontSide: string[] = [];
        const cards: Card[] = [];
        for (let i = 0; i < lines.length; i++)
        {
            const line = new Line(lines[i]);
            if (line.lineClass == LineClass.Header) {
                // we have reached a new header, create the previous card first
                
                const card = await this.cardFrom(frontSide, backSide);
                if (card) {
                    cards.push(card);
                }
                // reset the back
                backSide = [];

                // now, adjust the front to reflect the new chain of headers
                if (line.depth == frontSide.length) {
                    // new front is same depth previous card, replace last
                    // should not be able to go out of bounds since minimum header depth is 1.
                    frontSide[frontSide.length-1] = line.content;
                } else if (line.depth > frontSide.length) {
                    // going deeper
                    frontSide.push(line.content);
                } else {
                    // getting shallower
                    frontSide = frontSide.slice(0, line.depth - 1);
                    frontSide.push(line.content);
                }
            }
            else { // nonheader, just add line to back
                backSide.push(line.content);
            }
        } 

        // push the final card
        const card = await this.cardFrom(frontSide, backSide);
        if (card) {
            cards.push(card);
        }      
        return cards;
    }

    private async cardFrom(rawFrontLines: string[], back: string[]): Promise<Card | null> {
        if (rawFrontLines.length == 0 || back.length == 0) {
            return null;
        }
        else {
            const front = this.popReverseFlag(rawFrontLines);
            const isReverse = front.length < rawFrontLines.length;
            const joinedFront = front.join('\n').trim();
            const joinedBack = back.join('\n').trim();
            if (joinedBack == '') {
                return null;
            } else {
                const frontHtml = await new MdParser({}).parse(joinedFront);
                const backHtml = await new MdParser({}).parse(joinedBack);
                if (isReverse) {
                    return new Card(backHtml, frontHtml);
                }
                else {
                    return new Card(frontHtml, backHtml);
                }
                
            }            
        }
    }

    private popReverseFlag(front: string[]) {
        if (front.length == 0) return front;
        const matches = front[front.length - 1].match(this.reverseRegex)
        if (matches) {
            return front.slice(0,front.length-1)
        } else {
            return front;
        }
    }
}

enum LineClass {
    Header,
    NonHeader
}

class Line {
    public lineClass: LineClass = LineClass.NonHeader;
    public depth: number = 0;
    public content: string = "";

    constructor(content: string)
    {
        this.content = content;
        const matches = content.match(/^(#+)\s(.+)/);
        if (matches && matches.length == 3) {
            this.lineClass = LineClass.Header;
            this.depth = matches[1].length; // 1st group = number of #s
        }
    }
}