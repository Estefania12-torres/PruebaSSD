class FormatterService {
  /**
   * Transforms an array of JSON objects (DB rows) into a Markdown table.
   * @param {Array<Object>} results 
   * @returns {string} Markdown table
   */
  static formatResultsToMarkdown(results) {
    if (!results || !Array.isArray(results) || results.length === 0) {
      return 'No data found.';
    }

    const headers = Object.keys(results[0]);
    if (headers.length === 0) {
      return 'No data found.';
    }

    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    
    const bodyRows = results.map(row => {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) {
          return '';
        }
        return String(val).replace(/\n/g, ' ');
      });
      return `| ${values.join(' | ')} |`;
    });

    return [headerRow, separatorRow, ...bodyRows].join('\n');
  }

  /**
   * Populates a template string with the Markdown representation of the results.
   * @param {string} templateString 
   * @param {Array<Object>} results 
   * @returns {string} Populated template
   */
  static populateTemplate(templateString, results) {
    const markdownTable = this.formatResultsToMarkdown(results);
    
    if (!templateString || typeof templateString !== 'string') {
      return `Resultados de la consulta:\n\n${markdownTable}`;
    }

    if (templateString.includes('{{DATOS}}')) {
      return templateString.replace('{{DATOS}}', markdownTable);
    }

    return `${templateString}\n\n${markdownTable}`;
  }
}

module.exports = FormatterService;
