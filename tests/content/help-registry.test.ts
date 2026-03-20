import fs from 'fs';
import path from 'path';
import { articles } from '@/content/help/_index';

describe('help article registry', () => {
  it('only references article files that exist on disk', () => {
    const missing = Object.values(articles)
      .map((article) => ({
        key: `${article.category}/${article.slug}`,
        filePath: path.join(
          process.cwd(),
          'src/content/help',
          article.filePath.replace(/^\.\//, '')
        ),
      }))
      .filter(({ filePath }) => !fs.existsSync(filePath));

    expect(missing).toEqual([]);
  });
});
