const Sauce = require('../models/Sauce');
const fs = require('fs');

exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  let image = req.file.filename
  if(image != null ) {
      const sauce = new Sauce({
          ...sauceObject,
          imageUrl:`${req.protocol}://${req.get('host')}/images/${req.file.filename}`
      });
      sauce.save()
      .then(() => res.status(201).json({message: 'Sauce enregistrée !'}))
      .catch(error => res.status(500).json({message: error}))
  }else{
      res.status(402).send({message: 'Sauce non enregistrée !'})

  }
};

exports.getAllSauces = (req, res, next) => {
    Sauce.find()
      .then(sauces => res.status(200).json(sauces))
      .catch(error => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id })
      .then(sauce => res.status(200).json(sauce))
      .catch(error => res.status(404).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file ? {
      ...JSON.parse(req.body.sauce),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({_id: req.params.id})
      .then((sauce) => {
          if (sauce.userId != req.auth.userId) {
              res.status(401).json({ message : 'Not authorized'});
          } else {
              Sauce.updateOne({ _id: req.params.id}, { ...sauceObject, _id: req.params.id})
              .then(() => res.status(200).json({message : 'Objet modifié!'}))
              .catch(error => res.status(401).json({ error }));
          }
      })
      .catch((error) => {
          res.status(400).json({ error });
      });
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id})
      .then(sauce => {
          if (sauce.userId != req.auth.userId) {
              res.status(401).json({message: 'Not authorized'});
          } else {
              const filename = sauce.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => {
                  Sauce.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Objet supprimé !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};

exports.likeSauce = (req, res, next) => {
  Sauce.findOne({_id: req.params.id})
  .then(async sauce => {
      if (!sauce){
          res.status(404).json({message: 'La sauce n\'existe pas'});
      }else{
          const userId = req.body.userId;
          const like = req.body.like;
          let usersLiked = sauce.usersLiked;
          let usersDisliked = sauce.usersDisliked;
          switch (like) {
              case 1:
                  usersLiked.addToSet(userId);
                  break;
              case 0:
                  usersLiked = usersLiked.filter(element => element !== userId);
                  usersDisliked = usersDisliked.filter(element => element !== userId);
                  break;
              case -1:
                  usersDisliked.addToSet(userId);
                  break;
              default:
                  res.status(402).send({message: 'Valeur inconnue'})
                  break;
          }
          let likes = usersLiked.length;
          let dislikes = usersDisliked.length;
          await sauce.updateOne({
              usersLiked: usersLiked,
              usersDisliked: usersDisliked,
              likes: likes,
              dislikes: dislikes
          });
          res.status(200).send({message: 'Modification like effectué'})
      } 
  })
  .catch(error => res.status(500).json({error}))
}