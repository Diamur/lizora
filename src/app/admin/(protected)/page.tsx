export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-primary">Панель управления</h1>
      <div className="card mt-4">
        <h2>Добро пожаловать в Lizora! ✨</h2>
        <p>Выберите нужный раздел или урок в меню слева.</p>
        <p className="mt-4 text-gray-800">
          <strong>MVP Сценарий:</strong><br/>
          Откройте {'"'}Учи.ру{'"'} → {'"'}💻 Программирование{'"'} → {'"'}🏷️ Квесты{'"'}.<br/>
          Нажмите {'"'}+ Урок{'"'}, чтобы создать {'"'}Квест 1{'"'}.<br/>
          Внутри урока вы сможете добавить видео.
        </p>
      </div>
    </div>
  );
}
