import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme/theme';

interface Block {
  kind: 'heading' | 'paragraph' | 'bullet';
  text: string;
}

// The documents are plain text from the database: a blank line starts a
// paragraph, a line starting with "# " is a heading, and one starting with
// "- " or "• " is a bullet. Other line breaks are kept.
function toBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const endParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      paragraph = [];
    }
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      endParagraph();
    } else if (/^#{1,6}\s/.test(line)) {
      endParagraph();
      blocks.push({ kind: 'heading', text: line.replace(/^#{1,6}\s+/, '') });
    } else if (/^[-•]\s/.test(line)) {
      endParagraph();
      blocks.push({ kind: 'bullet', text: line.replace(/^[-•]\s+/, '') });
    } else {
      paragraph.push(line);
    }
  }
  endParagraph();
  return blocks;
}

export function LegalText({ content }: { content: string }) {
  return (
    <View style={styles.container}>
      {toBlocks(content).map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Text accessibilityRole="header" key={index} selectable style={styles.heading}>
              {block.text}
            </Text>
          );
        }
        if (block.kind === 'bullet') {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.body}>•</Text>
              <Text selectable style={[styles.body, styles.bulletText]}>
                {block.text}
              </Text>
            </View>
          );
        }
        return (
          <Text key={index} selectable style={styles.body}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: theme.spacing.xs,
  },
  body: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingLeft: theme.spacing.xs,
  },
  bulletText: {
    flex: 1,
  },
});
