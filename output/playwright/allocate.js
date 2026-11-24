async page => {
  const buttons = page.getByRole('button', { name: 'Max', exact: true });
  for (let i = 0; i < await buttons.count(); i++) await buttons.nth(i).click();
  await page.getByRole('button', { name: 'Prosseguir para Revisão', exact: true }).click();
}
